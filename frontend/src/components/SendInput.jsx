import React, { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { sendChatMessage } from "../api/messagesApi.js";
import { addOptimisticMessage, removeOptimisticMessage } from "../redux/messageSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import { normalizeUserId } from "../utils/messageConversation.js";

const TYPING_IDLE_MS = 1800;

function newClientMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const SendInput = () => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { selectedUser, authUser } = useSelector((store) => store.user);
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const typingTimer = useRef(null);

  const flushStopTyping = () => {
    if (!socket || !selectedUser?._id) return;
    socket.emit("stopTyping", { toUserId: String(selectedUser._id) });
  };

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      flushStopTyping();
    };
  }, []);

  const bumpTyping = () => {
    if (!socket?.connected || !selectedUser?._id) return;
    socket.emit("typing", { toUserId: String(selectedUser._id) });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      flushStopTyping();
      typingTimer.current = null;
    }, TYPING_IDLE_MS);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser?._id || !authUser?._id || sending) return;

    const text = message.trim();
    const clientMessageId = newClientMessageId();
    flushStopTyping();

    const optimistic = {
      _id: `temp:${clientMessageId}`,
      clientMessageId,
      senderID: normalizeUserId(authUser._id),
      receiverID: normalizeUserId(selectedUser._id),
      message: text,
      createdAt: new Date().toISOString(),
      _optimistic: true,
      sendState: "sending",
      deliveredAt: null,
      readAt: null,
    };
    dispatch(addOptimisticMessage(optimistic));
    setMessage("");
    setSending(true);

    try {
      await sendChatMessage(selectedUser._id, text, clientMessageId);
    } catch (error) {
      console.error("sendChatMessage failed", error);
      dispatch(removeOptimisticMessage(clientMessageId));
      setMessage(text);
      toast.error("Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmitHandler}
      className="
      flex gap-3
      p-4
      border-t border-white/10
      bg-white/5
      "
    >
      <input
        placeholder="Type a message..."
        className="
        w-full
        px-4
        py-2
        rounded-xl
        bg-black/30
        backdrop-blur-3xl
        border border-white/10
        text-sm
        text-white
        focus:outline-none
        focus:ring-2
        focus:ring-indigo-500
        "
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          bumpTyping();
        }}
        onBlur={() => {
          if (typingTimer.current) clearTimeout(typingTimer.current);
          flushStopTyping();
        }}
        type="text"
        disabled={sending}
      />

      <button
        type="submit"
        disabled={sending}
        className="
        px-5
        py-2
        rounded-xl
        bg-linear-to-r
        from-indigo-500
        to-violet-500
        text-white
        hover:scale-105
        transition
        shadow-lg
        cursor-pointer
        disabled:opacity-50 disabled:hover:scale-100
        "
      >
        <IoSend />
      </button>
    </form>
  );
};

export default SendInput;
