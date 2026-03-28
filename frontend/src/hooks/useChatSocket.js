import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext.jsx";
import {
  receiveSocketMessage,
  applyMessagesRead,
  setPeerTyping,
} from "../redux/messageSlice.js";
import { setonlineUsers, setotherUsers } from "../redux/userSlice.js";
import { isMessageInConversation } from "../utils/messageConversation.js";

/**
 * Socket listeners: newMessage, read receipts, typing, online users.
 */
export function useChatSocket() {
  const { socket } = useSocket();
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.user.authUser);
  const selectedUser = useSelector((s) => s.user.selectedUser);

  const authIdRef = useRef(null);
  const peerIdRef = useRef(null);
  authIdRef.current = authUser?._id ?? null;
  peerIdRef.current = selectedUser?._id ?? null;

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

    const onMessagesRead = ({ messageIds, readAt }) => {
      dispatch(applyMessagesRead({ messageIds, readAt }));
    };

    const onPeerTyping = ({ fromUserId, typing }) => {
      const peer = peerIdRef.current;
      if (peer == null || String(fromUserId) !== String(peer)) return;
      dispatch(setPeerTyping(Boolean(typing)));
    };

    socket.on("newMessage", onNewMessage);
    socket.on("getOnlineUsers", onOnlineUsers);
    socket.on("otherUsers", onOtherUsers);
    socket.on("messagesRead", onMessagesRead);
    socket.on("peerTyping", onPeerTyping);
    socket.emit("presenceSync");

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("getOnlineUsers", onOnlineUsers);
      socket.off("otherUsers", onOtherUsers);
      socket.off("messagesRead", onMessagesRead);
      socket.off("peerTyping", onPeerTyping);
    };
  }, [socket, dispatch]);
}
