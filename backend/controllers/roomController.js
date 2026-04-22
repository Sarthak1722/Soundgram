import mongoose from "mongoose";
import { GroupRoom } from "../models/groupRoomModel.js";
import { User } from "../models/userModel.js";
import { Message } from "../models/messageModel.js";
import { emitRoomDeletedToUsers, emitRoomUpsertToUsers } from "../socket/socket.js";

function uniqueIds(ids) {
  return [...new Set(ids.map((id) => String(id)).filter(Boolean))];
}

function isCreator(room, userId) {
  return String(room.createdBy) === String(userId);
}

function isAdmin(room, userId) {
  return (
    isCreator(room, userId) ||
    (room.admins || []).some((adminId) => String(adminId) === String(userId))
  );
}

async function populateRoom(roomId) {
  return GroupRoom.findById(roomId)
    .populate("members", "fullName userName profilePhoto")
    .lean();
}

async function loadFriendIdSet(userId) {
  const user = await User.findById(userId).select("friends").lean();
  return new Set((user?.friends || []).map((friendId) => String(friendId)));
}

export const createRoom = async (req, res) => {
  try {
    const me = req.id;
    const { name, memberIds = [] } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }
    const others = Array.isArray(memberIds) ? memberIds : [];
    const members = uniqueIds([me, ...others]);
    if (members.length < 2) {
      return res.status(400).json({ message: "Add at least one other person to the room" });
    }

    const friendIds = await loadFriendIdSet(me);
    const nonFriendIds = others.filter((id) => !friendIds.has(String(id)));
    if (nonFriendIds.length) {
      return res.status(403).json({ message: "You can only create group chats with added friends" });
    }

    for (const id of members) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: `Invalid member id: ${id}` });
      }
      const u = await User.findById(id).select("_id");
      if (!u) {
        return res.status(400).json({ message: `User not found: ${id}` });
      }
    }

    const room = await GroupRoom.create({
      name: String(name).trim(),
      members,
      admins: [me],
      createdBy: me,
    });

    const populated = await populateRoom(room._id);
    emitRoomUpsertToUsers(populated, members);

    return res.status(201).json(populated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to create room" });
  }
};

export const listMyRooms = async (req, res) => {
  try {
    const rooms = await GroupRoom.find({ members: req.id })
      .populate("members", "fullName userName profilePhoto")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json(rooms);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to list rooms" });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }
    const room = await GroupRoom.findOne({
      _id: id,
      members: req.id,
    })
      .populate("members", "fullName userName profilePhoto")
      .lean();

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    return res.status(200).json(room);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to load room" });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const room = await GroupRoom.findOne({ _id: id, members: req.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (!isAdmin(room, req.id)) {
      return res.status(403).json({ message: "Only group admins can rename this group" });
    }

    room.name = String(name).trim();
    await room.save();

    const populated = await populateRoom(room._id);
    emitRoomUpsertToUsers(populated, room.members);

    return res.status(200).json(populated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to update room" });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const room = await GroupRoom.findOne({ _id: id, members: req.id }).select("_id createdBy");
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (String(room.createdBy) !== String(req.id)) {
      return res.status(403).json({ message: "Only the group creator can delete this group" });
    }

    const memberIds = await GroupRoom.findById(room._id).select("members").lean();
    await Message.deleteMany({ roomID: room._id });
    await GroupRoom.deleteOne({ _id: room._id });
    emitRoomDeletedToUsers(room._id, memberIds?.members || []);

    return res.status(200).json({ success: true, roomId: String(room._id) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to delete room" });
  }
};

export const addRoomMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const room = await GroupRoom.findOne({ _id: id, members: req.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (!isAdmin(room, req.id)) {
      return res.status(403).json({ message: "Only group admins can add members" });
    }

    const uniqueMemberIds = uniqueIds(memberIds);
    if (!uniqueMemberIds.length) {
      return res.status(400).json({ message: "Pick at least one member to add" });
    }

    const friendIds = await loadFriendIdSet(req.id);
    const nonFriendIds = uniqueMemberIds.filter((memberId) => !friendIds.has(String(memberId)));
    if (nonFriendIds.length) {
      return res.status(403).json({ message: "You can only add friends to this group" });
    }

    for (const memberId of uniqueMemberIds) {
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        return res.status(400).json({ message: `Invalid member id: ${memberId}` });
      }
      const exists = await User.findById(memberId).select("_id");
      if (!exists) {
        return res.status(400).json({ message: `User not found: ${memberId}` });
      }
    }

    room.members = uniqueIds([...room.members.map((member) => String(member)), ...uniqueMemberIds]);
    await room.save();

    const populated = await populateRoom(room._id);
    emitRoomUpsertToUsers(populated, room.members);
    return res.status(200).json(populated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to add members" });
  }
};

export const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid room id" });
    }

    const room = await GroupRoom.findOne({ _id: id, members: req.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (isCreator(room, req.id)) {
      return res.status(403).json({ message: "The group creator cannot leave the group" });
    }

    room.members = room.members.filter((memberId) => String(memberId) !== String(req.id));
    room.admins = (room.admins || []).filter((adminId) => String(adminId) !== String(req.id));
    await room.save();
    const populated = await populateRoom(room._id);
    emitRoomDeletedToUsers(room._id, [req.id]);
    emitRoomUpsertToUsers(populated, room.members);

    return res.status(200).json({ success: true, roomId: String(room._id) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to leave room" });
  }
};

export const updateRoomAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId, makeAdmin } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(String(memberId))) {
      return res.status(400).json({ message: "Invalid room or member id" });
    }

    const room = await GroupRoom.findOne({ _id: id, members: req.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (!isCreator(room, req.id)) {
      return res.status(403).json({ message: "Only the group creator can manage admins" });
    }
    if (String(memberId) === String(room.createdBy)) {
      return res.status(400).json({ message: "The creator already has full access" });
    }
    if (!(room.members || []).some((currentId) => String(currentId) === String(memberId))) {
      return res.status(400).json({ message: "That user is not in the group" });
    }

    const currentAdmins = uniqueIds(room.admins || []);
    room.admins = makeAdmin
      ? uniqueIds([...currentAdmins, memberId])
      : currentAdmins.filter((adminId) => String(adminId) !== String(memberId));
    await room.save();

    const populated = await populateRoom(room._id);
    emitRoomUpsertToUsers(populated, room.members);
    return res.status(200).json(populated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to update admin privileges" });
  }
};
