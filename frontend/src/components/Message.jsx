import { useSelector } from "react-redux";
import React from "react";
import { IoCheckmark, IoTimeOutline } from "react-icons/io5";
import { normalizeUserId } from "../utils/messageConversation.js";

function OutgoingStatus({ message }) {
  if (message._optimistic && message.sendState === "sending") {
    return (
      <span className="flex items-center justify-end gap-1 text-[10px] text-zinc-400">
        <IoTimeOutline className="text-xs" />
        Sending…
      </span>
    );
  }

  const read = Boolean(message.readAt);
  const delivered = Boolean(message.deliveredAt);

  if (read) {
    return (
      <span className="flex items-center justify-end gap-px text-[11px] font-semibold text-sky-400" title="Read">
        <IoCheckmark />
        <IoCheckmark className="-ml-1" />
      </span>
    );
  }
  if (delivered) {
    return (
      <span className="flex items-center justify-end gap-px text-[11px] text-zinc-400" title="Delivered">
        <IoCheckmark />
        <IoCheckmark className="-ml-1" />
      </span>
    );
  }
  return (
    <span className="flex justify-end text-[11px] text-zinc-500" title="Sent">
      <IoCheckmark />
    </span>
  );
}

const Message = ({ message }) => {
  const { authUser, selectedUser } = useSelector((store) => store.user);
  const isSender = normalizeUserId(message.senderID) === normalizeUserId(authUser?._id);

  return (
    <div className={`chat ${isSender ? "chat-end" : "chat-start"}`}>
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img
            src={isSender ? authUser.profilePhoto : selectedUser?.profilePhoto}
            alt=""
          />
        </div>
      </div>

      <div className="chat-header">
        {isSender ? authUser.fullName : selectedUser?.fullName}
      </div>

      <div
        className={`chat-bubble bg-linear-to-r
          ${
            isSender
              ? "from-violet-500 to-indigo-500"
              : "from-indigo-500 to-violet-500"
          }
        text-white
        px-4
        py-2
        rounded-2xl
        text-sm
        max-w-65
        backdrop-blur-md`}
      >
        {message.message}
      </div>

      <div className="chat-footer min-h-[14px] opacity-90">
        {isSender ? <OutgoingStatus message={message} /> : null}
      </div>
    </div>
  );
};

export default Message;
