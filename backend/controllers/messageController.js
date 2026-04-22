import mongoose from "mongoose";
import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";
import { GroupRoom } from "../models/groupRoomModel.js";
import { User } from "../models/userModel.js";
import {
  emitNewMessageToParticipants,
  emitNewGroupMessageToRoom,
  getSocketIdForUser,
} from "../socket/socket.js";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;

function participantThreadFilter(senderID, receiverID) {
  const a = new mongoose.Types.ObjectId(String(senderID));
  const b = new mongoose.Types.ObjectId(String(receiverID));
  return {
    $or: [
      { senderID: a, receiverID: b },
      { senderID: b, receiverID: a },
    ],
  };
}

async function findAuthorizedRoom(roomId, userId) {
  if (!mongoose.Types.ObjectId.isValid(String(roomId))) {
    return null;
  }

  return GroupRoom.findOne({
    _id: roomId,
    members: userId,
  }).select("_id name members").lean();
}

async function usersCanDirectMessage(senderId, receiverId) {
  if (!mongoose.Types.ObjectId.isValid(String(senderId)) || !mongoose.Types.ObjectId.isValid(String(receiverId))) {
    return false;
  }

  const sender = await User.findOne({
    _id: senderId,
    friends: receiverId,
  })
    .select("_id")
    .lean();

  return Boolean(sender);
}

export const sendMessage = async (req, res) => {
  try {
    const senderID = new mongoose.Types.ObjectId(String(req.id));
    const receiverID = new mongoose.Types.ObjectId(String(req.params.id));
    const { message, clientMessageId } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!(await usersCanDirectMessage(senderID, receiverID))) {
      return res.status(403).json({ message: "Add this user as a friend before sending a message" });
    }

    let gotConversation = await Conversation.findOne({
      participants: { $all: [senderID, receiverID] },
    });
    if (!gotConversation) {
      gotConversation = await Conversation.create({
        participants: [senderID, receiverID],
      });
    }

    const newMessage = await Message.create({
      senderID,
      receiverID,
      message: String(message).trim(),
      clientMessageId:
        clientMessageId && String(clientMessageId).trim()
          ? String(clientMessageId).trim()
          : undefined,
    });

    gotConversation.messages.push(newMessage._id);
    await gotConversation.save();

    let doc = newMessage;
    if (getSocketIdForUser(String(receiverID))) {
      await Message.findByIdAndUpdate(newMessage._id, {
        deliveredAt: new Date(),
      });
      doc = await Message.findById(newMessage._id);
    }

    emitNewMessageToParticipants(String(senderID), String(receiverID), doc);

    return res.status(201).json({
      message: "message sent, expect a reply soon ❤️",
      contents: doc,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to send message" });
  }
};

export const getMessage = async (req, res) => {
  try {
    const senderID = req.id;
    const receiverID = req.params.id;
    const before = req.query.before;
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    if (!(await usersCanDirectMessage(senderID, receiverID))) {
      return res.status(403).json({ message: "Add this user as a friend before opening the conversation" });
    }

    const baseFilter = participantThreadFilter(senderID, receiverID);
    const filter = { ...baseFilter };

    if (before && mongoose.Types.ObjectId.isValid(String(before))) {
      const cursor = await Message.findById(before).lean();
      if (cursor) {
        filter.createdAt = { $lt: cursor.createdAt };
      }
    }

    const batch = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const chronological = batch.reverse();
    const hasMore = batch.length === limit;

    return res.status(200).json({
      messages: chronological,
      hasMore,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to load messages" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const senderID = new mongoose.Types.ObjectId(String(req.id));
    const room = await findAuthorizedRoom(req.params.roomId, req.id);
    const { message, clientMessageId } = req.body;

    if (!room) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const now = new Date();
    const deliveredTo = room.members
      .map((memberId) => String(memberId))
      .filter((memberId) => memberId !== String(req.id) && getSocketIdForUser(memberId))
      .map((memberId) => ({
        userId: new mongoose.Types.ObjectId(memberId),
        deliveredAt: now,
      }));

    const newMessage = await Message.create({
      senderID,
      roomID: room._id,
      message: String(message).trim(),
      deliveredTo,
      clientMessageId:
        clientMessageId && String(clientMessageId).trim()
          ? String(clientMessageId).trim()
          : undefined,
    });

    await GroupRoom.updateOne({ _id: room._id }, { $set: { updatedAt: new Date() } });

    const populated = await Message.findById(newMessage._id)
      .populate("senderID", "fullName userName profilePhoto")
      .lean();

    emitNewGroupMessageToRoom(String(room._id), room.members, populated);

    return res.status(201).json({
      message: "group message sent",
      contents: populated,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to send group message" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const room = await findAuthorizedRoom(req.params.roomId, req.id);
    if (!room) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const before = req.query.before;
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const filter = {
      roomID: new mongoose.Types.ObjectId(String(room._id)),
    };

    if (before && mongoose.Types.ObjectId.isValid(String(before))) {
      const cursor = await Message.findOne({
        _id: before,
        roomID: room._id,
      }).lean();
      if (cursor) {
        filter.createdAt = { $lt: cursor.createdAt };
      }
    }

    const batch = await Message.find(filter)
      .populate("senderID", "fullName userName profilePhoto")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const chronological = batch.reverse();
    const hasMore = batch.length === limit;

    return res.status(200).json({
      messages: chronological,
      hasMore,
      room,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to load group messages" });
  }
};

export const markGroupRead = async (req, res) => {
  try {
    const room = await findAuthorizedRoom(req.params.roomId, req.id);
    if (!room) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const readerId = String(req.id);
    const now = new Date();
    const unreadMessages = await Message.find({
      roomID: room._id,
      senderID: { $ne: new mongoose.Types.ObjectId(readerId) },
      "readBy.userId": { $ne: new mongoose.Types.ObjectId(readerId) },
    }).select("_id");

    if (!unreadMessages.length) {
      return res.status(200).json({ messageIds: [], userId: readerId, readAt: now.toISOString() });
    }

    const ids = unreadMessages.map((doc) => doc._id);
    await Message.updateMany(
      { _id: { $in: ids } },
      {
        $push: {
          readBy: {
            userId: new mongoose.Types.ObjectId(readerId),
            readAt: now,
          },
        },
      },
    );

    return res.status(200).json({
      messageIds: ids.map((id) => String(id)),
      userId: readerId,
      readAt: now.toISOString(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to mark group messages as read" });
  }
};
