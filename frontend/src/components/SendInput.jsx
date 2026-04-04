import React, { useState, useRef, useEffect, useCallback } from "react";
import { IoSend } from "react-icons/io5";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { sendChatMessage, sendGroupChatMessage } from "../api/messagesApi.js";
import { addOptimisticMessage, removeOptimisticMessage } from "../redux/messageSlice.js";
import { useSocket } from "../context/useSocket.js";
import { normalizeUserId } from "../utils/messageConversation.js";

const TYPING_IDLE_MS = 1800;

function newClientMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const SendInput = () => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { selectedUser, authUser } = useSelector((store) => store.user);
  const selectedRoomChat = useSelector((store) => store.rooms.selectedRoomChat);
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const typingTimer = useRef(null);
  const isGroupThread = Boolean(selectedRoomChat?._id);

  const flushStopTyping = useCallback(() => {
    if (!socket) return;
    if (isGroupThread && selectedRoomChat?._id) {
      socket.emit("stopGroupTyping", {
        roomId: String(selectedRoomChat._id),
        userName: authUser?.fullName || "Someone",
      });
      return;
    }
    if (!selectedUser?._id) return;
    socket.emit("stopTyping", { toUserId: String(selectedUser._id) });
  }, [authUser?.fullName, isGroupThread, selectedRoomChat?._id, selectedUser?._id, socket]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      flushStopTyping();
    };
  }, [flushStopTyping]);

  useEffect(() => {
    setMessage("");
  }, [selectedUser?._id, selectedRoomChat?._id]);

  const selectedFirstName = selectedUser?.fullName?.trim()?.split(/\s+/)?.[0];

  const bumpTyping = () => {
    if (!socket?.connected) return;
    if (isGroupThread && selectedRoomChat?._id) {
      socket.emit("groupTyping", {
        roomId: String(selectedRoomChat._id),
        userName: authUser?.fullName || "Someone",
      });
    } else if (selectedUser?._id) {
      socket.emit("typing", { toUserId: String(selectedUser._id) });
    } else {
      return;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      flushStopTyping();
      typingTimer.current = null;
    }, TYPING_IDLE_MS);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!message.trim() || !authUser?._id || sending) return;
    if (!isGroupThread && !selectedUser?._id) return;
    if (isGroupThread && !selectedRoomChat?._id) return;

    const text = message.trim();
    const clientMessageId = newClientMessageId();
    flushStopTyping();

    const optimistic = {
      _id: `temp:${clientMessageId}`,
      clientMessageId,
      senderID: normalizeUserId(authUser._id),
      receiverID: isGroupThread ? null : normalizeUserId(selectedUser._id),
      roomID: isGroupThread ? String(selectedRoomChat._id) : null,
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
      if (isGroupThread) {
        await sendGroupChatMessage(selectedRoomChat._id, text, clientMessageId);
      } else {
        await sendChatMessage(selectedUser._id, text, clientMessageId);
      }
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
      className="mx-2 mb-2 mt-1 flex gap-2 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,19,20,0.98),rgba(13,13,14,0.96))] px-2.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:mx-4 sm:mb-4 sm:mt-2 sm:gap-3 sm:px-3.5 sm:py-3"
    >
      <input
        placeholder={
          isGroupThread
            ? `Message ${selectedRoomChat?.name || "group"}...`
            : selectedFirstName
              ? `Message ${selectedFirstName}...`
              : "Type a message..."
        }
        className="
        w-full
        px-4
        py-2.5
        rounded-[20px]
        bg-black/35
        backdrop-blur-3xl
        border border-white/10
        text-[15px]
        text-white
        focus:outline-none
        focus:ring-2
        focus:ring-emerald-500
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

      <div className="flex flex-col items-end gap-1">
        <button
          type="submit"
          disabled={sending}
          className="
          px-3.5
          py-2.5
          rounded-[18px]
          bg-linear-to-r
          from-emerald-500
          to-green-600
          text-white
          hover:scale-105
          transition
          shadow-lg
          cursor-pointer
          disabled:opacity-50 disabled:hover:scale-100
          "
        >
          <IoSend className="text-lg" />
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"></span>
      </div>
    </form>
  );
};

export default SendInput;
