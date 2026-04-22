import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { Message } from "../models/messageModel.js";
import { User } from "../models/userModel.js";
import { GroupRoom } from "../models/groupRoomModel.js";
import {
  attachPlaybackSocketHandlers,
  detachPlaybackOnDisconnect,
} from "../playback/playbackSocket.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server);

/** @type {Record<string, string>} userId (string) -> socket.id */
const userSocketMap = {};

function mapOtherUsers(allUsers, currentUserId) {
  return allUsers.filter((user) => String(user._id) !== String(currentUserId));
}

function groupChatSocketRoom(roomId) {
  return `chat:group:${roomId}`;
}

function toRoomPayload(room) {
  if (!room) return null;
  return {
    ...room,
    _id: room._id != null ? String(room._id) : room._id,
    createdBy: room.createdBy != null ? String(room.createdBy) : room.createdBy,
    admins: Array.isArray(room.admins) ? room.admins.map((id) => String(id)) : [],
    members: Array.isArray(room.members)
      ? room.members.map((member) => ({
          ...member,
          _id: member?._id != null ? String(member._id) : member?._id,
        }))
      : [],
  };
}

function isPlainPopulatedDoc(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value._id != null &&
      !("buffer" in value),
  );
}

async function loadAllUsers() {
  return User.find({}).select("fullName userName profilePhoto gender").lean();
}

export async function emitPresenceSnapshotToSocket(socket, userId, allUsers = null) {
  if (!socket || !userId) {
    return;
  }

  const users = Array.isArray(allUsers) ? allUsers : await loadAllUsers();
  const onlineUsers = Object.keys(userSocketMap);
  const otherUsers = mapOtherUsers(users, userId);

  socket.emit("getOnlineUsers", onlineUsers);
  socket.emit("otherUsers", otherUsers);
}

export async function broadcastPresenceSnapshots() {
  const sockets = await io.fetchSockets();
  if (!sockets.length) {
    return;
  }

  const allUsers = await loadAllUsers();
  await Promise.all(
    sockets.map(async (socket) => {
      const socketUserId = socket.data?.userId;
      if (!socketUserId) {
        return;
      }
      await emitPresenceSnapshotToSocket(socket, socketUserId, allUsers);
    }),
  );
}

export function getSocketIdForUser(userId) {
  if (userId == null || userId === "undefined") return undefined;
  return userSocketMap[String(userId)];
}

/**
 * Plain JSON-safe message for clients (consistent string ids).
 */
function toMessagePayload(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const senderRef = isPlainPopulatedDoc(o.senderID)
    ? {
        ...o.senderID,
        _id: String(o.senderID._id),
      }
    : o.senderID != null
      ? String(o.senderID)
      : o.senderID;

  return {
    ...o,
    _id: o._id != null ? String(o._id) : o._id,
    senderID: senderRef,
    receiverID: o.receiverID != null ? String(o.receiverID) : o.receiverID,
    roomID: o.roomID != null ? String(o.roomID) : o.roomID,
    clientMessageId: o.clientMessageId || undefined,
    deliveredAt: o.deliveredAt ? new Date(o.deliveredAt).toISOString() : null,
    readAt: o.readAt ? new Date(o.readAt).toISOString() : null,
    deliveredTo: Array.isArray(o.deliveredTo)
      ? o.deliveredTo.map((entry) => ({
          userId: entry?.userId != null ? String(entry.userId) : "",
          deliveredAt: entry?.deliveredAt ? new Date(entry.deliveredAt).toISOString() : null,
        }))
      : [],
    readBy: Array.isArray(o.readBy)
      ? o.readBy.map((entry) => ({
          userId: entry?.userId != null ? String(entry.userId) : "",
          readAt: entry?.readAt ? new Date(entry.readAt).toISOString() : null,
        }))
      : [],
  };
}

/**
 * Emit a new message exactly once to each connected participant (sender + receiver).
 */
export function emitNewMessageToParticipants(senderId, receiverId, messageDoc) {
  const payload = toMessagePayload(messageDoc);
  const senderSocketId = getSocketIdForUser(senderId);
  const receiverSocketId = getSocketIdForUser(receiverId);

  if (senderSocketId) {
    io.to(senderSocketId).emit("newMessage", payload);
  }
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", payload);
  }
}

export function emitNewGroupMessageToRoom(roomId, memberIds = [], messageDoc) {
  const payload = toMessagePayload(messageDoc);
  io.to(groupChatSocketRoom(roomId)).emit("groupMessage", payload);
  memberIds.forEach((memberId) => {
    const socketId = getSocketIdForUser(memberId);
    if (socketId) {
      io.to(socketId).emit("groupMessage", payload);
    }
  });
}

export function emitRoomUpsertToUsers(room, targetUserIds = []) {
  const payload = toRoomPayload(room);
  if (!payload) return;
  targetUserIds.forEach((userId) => {
    const socketId = getSocketIdForUser(userId);
    if (socketId) {
      io.to(socketId).emit("roomUpsert", payload);
    }
  });
}

export function emitRoomDeletedToUsers(roomId, targetUserIds = []) {
  const payload = { roomId: String(roomId) };
  targetUserIds.forEach((userId) => {
    const socketId = getSocketIdForUser(userId);
    if (socketId) {
      io.to(socketId).emit("roomDeleted", payload);
    }
  });
}

async function userHasGroupRoomAccess(userId, roomId) {
  if (!userId || !roomId || !mongoose.Types.ObjectId.isValid(String(roomId))) {
    return false;
  }

  const room = await GroupRoom.findOne({
    _id: roomId,
    members: userId,
  })
    .select("_id members")
    .lean();

  return Boolean(room);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  const rawUserId = socket.handshake.query.userId;
  const userId =
    rawUserId != null && String(rawUserId) !== "undefined" ? String(rawUserId) : null;

  if (userId) {
    userSocketMap[userId] = socket.id;
    socket.data.userId = userId;
  }

  void emitPresenceSnapshotToSocket(socket, userId).catch((error) => {
    console.error("presence snapshot failed", error);
  });
  void broadcastPresenceSnapshots().catch((error) => {
    console.error("presence broadcast failed", error);
  });

  attachPlaybackSocketHandlers(io, socket, userId);

  socket.on("presenceSync", () => {
    void emitPresenceSnapshotToSocket(socket, userId).catch((error) => {
      console.error("presence sync failed", error);
    });
  });

  socket.on("typing", ({ toUserId }) => {
    if (!userId || !toUserId) return;
    const sid = getSocketIdForUser(toUserId);
    if (sid) io.to(sid).emit("peerTyping", { fromUserId: userId, typing: true });
  });

  socket.on("stopTyping", ({ toUserId }) => {
    if (!userId || !toUserId) return;
    const sid = getSocketIdForUser(toUserId);
    if (sid) io.to(sid).emit("peerTyping", { fromUserId: userId, typing: false });
  });

  socket.on("groupChatJoin", async ({ roomId }) => {
    if (!userId || !roomId) return;
    if (!(await userHasGroupRoomAccess(userId, roomId))) return;

    const previousRoom = socket.data?.groupChatRoom;
    if (previousRoom) {
      socket.leave(previousRoom);
    }

    const nextRoom = groupChatSocketRoom(roomId);
    socket.join(nextRoom);
    socket.data.groupChatRoom = nextRoom;
    socket.data.groupChatRoomId = String(roomId);
  });

  socket.on("groupChatLeave", ({ roomId } = {}) => {
    const joinedRoom = socket.data?.groupChatRoom;
    const joinedRoomId = socket.data?.groupChatRoomId;
    if (!joinedRoom) return;
    if (roomId && String(roomId) !== String(joinedRoomId)) return;
    socket.leave(joinedRoom);
    socket.data.groupChatRoom = null;
    socket.data.groupChatRoomId = null;
  });

  socket.on("groupTyping", async ({ roomId, userName }) => {
    if (!userId || !roomId) return;
    if (!(await userHasGroupRoomAccess(userId, roomId))) return;
    socket.to(groupChatSocketRoom(roomId)).emit("groupTyping", {
      roomId: String(roomId),
      fromUserId: String(userId),
      userName: userName || null,
      typing: true,
    });
  });

  socket.on("stopGroupTyping", async ({ roomId, userName }) => {
    if (!userId || !roomId) return;
    if (!(await userHasGroupRoomAccess(userId, roomId))) return;
    socket.to(groupChatSocketRoom(roomId)).emit("groupTyping", {
      roomId: String(roomId),
      fromUserId: String(userId),
      userName: userName || null,
      typing: false,
    });
  });

  socket.on("markRead", async ({ withUserId }) => {
    try {
      if (!userId || !withUserId) return;
      const reader = new mongoose.Types.ObjectId(String(userId));
      const sender = new mongoose.Types.ObjectId(String(withUserId));
      const list = await Message.find({
        senderID: sender,
        receiverID: reader,
        readAt: null,
      }).select("_id");
      if (!list.length) return;
      const ids = list.map((d) => d._id);
      const now = new Date();
      await Message.updateMany({ _id: { $in: ids } }, { $set: { readAt: now } });
      const senderSock = getSocketIdForUser(withUserId);
      if (senderSock) {
        io.to(senderSock).emit("messagesRead", {
          messageIds: ids.map((id) => String(id)),
          readAt: now.toISOString(),
        });
      }
    } catch (e) {
      console.error("markRead", e);
    }
  });

  socket.on("groupMessagesRead", async ({ roomId, messageIds, userId: readerId, readAt }) => {
    try {
      if (!userId || !roomId || !Array.isArray(messageIds) || !messageIds.length) return;
      if (!(await userHasGroupRoomAccess(userId, roomId))) return;
      io.to(groupChatSocketRoom(roomId)).emit("groupMessagesRead", {
        roomId: String(roomId),
        messageIds: messageIds.map((id) => String(id)),
        userId: String(readerId || userId),
        readAt,
      });
    } catch (error) {
      console.error("groupMessagesRead", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    detachPlaybackOnDisconnect(socket);
    if (userId) {
      delete userSocketMap[userId];
    }
    void broadcastPresenceSnapshots().catch((error) => {
      console.error("presence broadcast failed", error);
    });
  });
});

export { app, server, io };
