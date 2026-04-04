import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { IoCheckmark, IoTimeOutline } from "react-icons/io5";
import { normalizeUserId } from "../utils/messageConversation.js";

const SWIPE_REVEAL_PX = 72;
const SWIPE_OVERSHOOT_DAMPING = 0.22;

function formatMessageTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function OutgoingStatus({ message }) {
  if (message._optimistic && message.sendState === "sending") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
        <IoTimeOutline className="text-xs" />
        Sending...
      </span>
    );
  }

  const read = Boolean(message.readAt);
  const delivered = Boolean(message.deliveredAt);

  if (read) {
    return (
      <span className="flex items-center gap-px text-[11px] font-semibold text-sky-400" title="Seen">
        <IoCheckmark />
        <IoCheckmark className="-ml-1" />
      </span>
    );
  }
  if (delivered) {
    return (
      <span className="flex items-center gap-px text-[11px] text-zinc-400" title="Delivered">
        <IoCheckmark />
        <IoCheckmark className="-ml-1" />
      </span>
    );
  }
  return (
    <span className="flex items-center text-[11px] text-zinc-500" title="Sent">
      <IoCheckmark />
    </span>
  );
}

function GroupOutgoingStatus({ message, authUserId, roomMembers = [] }) {
  if (message._optimistic && message.sendState === "sending") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
        <IoTimeOutline className="text-xs" />
        Sending...
      </span>
    );
  }

  const deliveredCount = (message.deliveredTo || []).filter(
    (entry) => normalizeUserId(entry.userId) !== normalizeUserId(authUserId),
  ).length;
  const memberNameMap = new Map(
    roomMembers.map((member) => [normalizeUserId(member?._id), member?.fullName || "Someone"]),
  );
  const readNames = (message.readBy || [])
    .filter((entry) => normalizeUserId(entry.userId) !== normalizeUserId(authUserId))
    .map((entry) => memberNameMap.get(normalizeUserId(entry.userId)) || "Someone");

  if (readNames.length > 0) {
    return (
      <span className="text-[11px] font-semibold text-sky-400" title="Seen">
        Seen by {readNames.join(", ")}
      </span>
    );
  }
  if (deliveredCount > 0) {
    return (
      <span className="text-[11px] text-zinc-400" title="Delivered">
        Delivered
      </span>
    );
  }
  return (
    <span className="text-[11px] text-zinc-500" title="Sent">
      Sent
    </span>
  );
}

function applyRubberBand(distance, limit) {
  const absDistance = Math.abs(distance);
  if (absDistance <= limit) return distance;

  const overshoot = absDistance - limit;
  const dampedOvershoot = overshoot * SWIPE_OVERSHOOT_DAMPING;
  return Math.sign(distance) * (limit + dampedOvershoot);
}

const Message = ({
  message,
  isGroupThread,
  startsCluster,
  endsCluster,
  showSenderName,
  showStatus,
}) => {
  const { authUser, selectedUser } = useSelector((store) => store.user);
  const selectedRoomChat = useSelector((store) => store.rooms.selectedRoomChat);
  const isSender = normalizeUserId(message.senderID) === normalizeUserId(authUser?._id);
  const timeLabel = formatMessageTime(message.createdAt);
  const senderProfile =
    typeof message.senderID === "object" && message.senderID !== null ? message.senderID : null;
  const senderName = isSender
    ? authUser?.fullName
    : senderProfile?.fullName || selectedUser?.fullName || "Unknown";
  const senderPhoto = isSender
    ? authUser?.profilePhoto
    : senderProfile?.profilePhoto || selectedUser?.profilePhoto;
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapAnimating, setIsSnapAnimating] = useState(false);
  const pointerState = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    dragging: false,
  });

  const maxReveal = isSender ? -SWIPE_REVEAL_PX : SWIPE_REVEAL_PX;
  const bubbleRadius = [
    startsCluster ? "rounded-t-[22px]" : isSender ? "rounded-tr-[8px]" : "rounded-tl-[8px]",
    endsCluster ? "rounded-b-[22px]" : isSender ? "rounded-br-[8px]" : "rounded-bl-[8px]",
    isSender ? "rounded-l-[22px]" : "rounded-r-[22px]",
  ].join(" ");

  const resetSwipe = () => {
    pointerState.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      dragging: false,
    };
    setIsDragging(false);
    setIsSnapAnimating(true);
    setDragX(0);
    window.setTimeout(() => {
      setIsSnapAnimating(false);
    }, 220);
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.buttons !== 1) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
    setIsSnapAnimating(false);
  };

  const handlePointerMove = (event) => {
    if (pointerState.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - pointerState.current.startX;
    const dy = event.clientY - pointerState.current.startY;

    if (!pointerState.current.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      pointerState.current.dragging = true;
      setIsDragging(true);
    }

    const intendedX = isSender ? Math.min(dx, 0) : Math.max(dx, 0);
    const nextX = applyRubberBand(intendedX, Math.abs(maxReveal));

    setDragX(nextX);
  };

  const handlePointerEnd = (event) => {
    if (pointerState.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    resetSwipe();
  };

  return (
    <div className={`message-row ${isSender ? "items-end" : "items-start"} ${endsCluster ? "mb-3.5 sm:mb-4" : "mb-1"}`}>
      {showSenderName ? (
        <p className={`mb-1 px-12 text-[11px] font-medium text-zinc-500 ${isSender ? "text-right" : "text-left"}`}>
          {senderName}
        </p>
      ) : null}

      <div className={`flex w-full items-end gap-2 ${isSender ? "justify-end" : "justify-start"}`}>
        {!isSender ? (
          <div className={`h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/5 ${endsCluster ? "opacity-100" : "opacity-0"}`}>
            {endsCluster && senderPhoto ? (
              <img src={senderPhoto} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        ) : null}

        <div className={`message-swipe-shell ${isSender ? "justify-end" : "justify-start"}`}>
          <span
            className={`message-time-reveal ${isSender ? "right-0 text-right" : "left-0 text-left"} ${Math.abs(dragX) > 12 ? "opacity-100" : "opacity-0"}`}
          >
            {timeLabel}
          </span>

          <div
            className={`message-bubble-wrap ${isSender ? "ml-auto" : "mr-auto"} ${isDragging ? "message-bubble-wrap--dragging" : ""} ${isSnapAnimating ? "message-bubble-wrap--snap" : ""}`}
            style={{ transform: `translateX(${dragX}px)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
          >
            <div
              className={`max-w-[min(78vw,22rem)] border px-3.5 py-2 text-[15px] leading-[1.35] shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop-blur-md sm:max-w-[min(68vw,24rem)] sm:px-4 ${
                isSender
                  ? "border-emerald-400/20 bg-[#1f6f58] text-white"
                  : "border-white/8 bg-[#151515] text-zinc-100"
              } ${bubbleRadius}`}
            >
              {message.message}
            </div>
          </div>
        </div>
      </div>

      {isSender && showStatus ? (
        <div className="mt-1 flex w-full justify-end pr-1">
          {isGroupThread ? (
            <GroupOutgoingStatus
              message={message}
              authUserId={authUser?._id}
              roomMembers={selectedRoomChat?.members || []}
            />
          ) : (
            <OutgoingStatus message={message} />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Message;
