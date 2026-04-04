import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/useSocket.js";
import {
  receiveSocketMessage,
  applyMessagesRead,
  applyGroupMessagesRead,
  setPeerTyping,
  setGroupTypingState,
} from "../redux/messageSlice.js";
import { setonlineUsers, setotherUsers } from "../redux/userSlice.js";
import { removeRoom, upsertRoom } from "../redux/roomsSlice.js";
import { isMessageInConversation } from "../utils/messageConversation.js";

/**
 * Socket listeners: newMessage, read receipts, typing, online users.
 */
export function useChatSocket() {
  const { socket } = useSocket();
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.user.authUser);
  const selectedUser = useSelector((s) => s.user.selectedUser);
  const selectedRoomChat = useSelector((s) => s.rooms.selectedRoomChat);

  const authIdRef = useRef(null);
  const peerIdRef = useRef(null);
  const roomIdRef = useRef(null);

  useEffect(() => {
    authIdRef.current = authUser?._id ?? null;
    peerIdRef.current = selectedUser?._id ?? null;
    roomIdRef.current = selectedRoomChat?._id ?? null;
  }, [authUser?._id, selectedUser?._id, selectedRoomChat?._id]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg) => {
      const me = authIdRef.current;
      const peer = peerIdRef.current;
      if (me == null || peer == null) return;
      if (!isMessageInConversation(msg, me, peer)) return;
      dispatch(receiveSocketMessage(msg));
    };

    const onOnlineUsers = (userIds) => {
      dispatch(setonlineUsers(userIds));
    };

    const onOtherUsers = (users) => {
      dispatch(setotherUsers(Array.isArray(users) ? users : []));
    };

    const onRoomUpsert = (room) => {
      dispatch(upsertRoom(room));
    };

    const onRoomDeleted = ({ roomId }) => {
      if (!roomId) return;
      dispatch(removeRoom(roomId));
    };

    const onMessagesRead = ({ messageIds, readAt }) => {
      dispatch(applyMessagesRead({ messageIds, readAt }));
    };

    const onPeerTyping = ({ fromUserId, typing }) => {
      const peer = peerIdRef.current;
      if (peer == null || String(fromUserId) !== String(peer)) return;
      dispatch(setPeerTyping(Boolean(typing)));
    };

    const onGroupMessagesRead = ({ roomId, messageIds, userId, readAt }) => {
      const activeRoomId = roomIdRef.current;
      if (!activeRoomId || String(activeRoomId) !== String(roomId)) return;
      dispatch(applyGroupMessagesRead({ messageIds, userId, readAt }));
    };

    const onGroupMessage = (msg) => {
      const roomId = roomIdRef.current;
      if (!roomId || String(msg.roomID) !== String(roomId)) return;
      dispatch(receiveSocketMessage(msg));
    };

    const onGroupTyping = ({ roomId, fromUserId, userName, typing }) => {
      const activeRoomId = roomIdRef.current;
      if (!activeRoomId || String(activeRoomId) !== String(roomId)) return;
      dispatch(setGroupTypingState({ roomId, userId: fromUserId, userName, typing }));
    };

    socket.on("newMessage", onNewMessage);
    socket.on("groupMessage", onGroupMessage);
    socket.on("getOnlineUsers", onOnlineUsers);
    socket.on("otherUsers", onOtherUsers);
    socket.on("messagesRead", onMessagesRead);
    socket.on("peerTyping", onPeerTyping);
    socket.on("groupTyping", onGroupTyping);
    socket.on("groupMessagesRead", onGroupMessagesRead);
    socket.on("roomUpsert", onRoomUpsert);
    socket.on("roomDeleted", onRoomDeleted);
    socket.emit("presenceSync");

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("groupMessage", onGroupMessage);
      socket.off("getOnlineUsers", onOnlineUsers);
      socket.off("otherUsers", onOtherUsers);
      socket.off("messagesRead", onMessagesRead);
      socket.off("peerTyping", onPeerTyping);
      socket.off("groupTyping", onGroupTyping);
      socket.off("groupMessagesRead", onGroupMessagesRead);
      socket.off("roomUpsert", onRoomUpsert);
      socket.off("roomDeleted", onRoomDeleted);
    };
  }, [socket, dispatch]);

  useEffect(() => {
    if (!socket) return;
    const roomId = selectedRoomChat?._id;

    if (!roomId) {
      socket.emit("groupChatLeave");
      return;
    }

    socket.emit("groupChatJoin", { roomId: String(roomId) });
    return () => {
      socket.emit("groupChatLeave", { roomId: String(roomId) });
    };
  }, [socket, selectedRoomChat?._id]);
}
