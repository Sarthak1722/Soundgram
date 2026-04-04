import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import Message from "./Message.jsx";
import useGetMessages from "../hooks/useGetMessages";
import { normalizeUserId } from "../utils/messageConversation.js";

function startOfDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function sameDay(a, b) {
  return startOfDayKey(a) === startOfDayKey(b);
}

function formatDayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfTarget) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function sameSender(a, b) {
  return normalizeUserId(a?.senderID) === normalizeUserId(b?.senderID);
}

const Messages = () => {
  const { loadingInitial, loadingOlder, loadOlder, hasMoreOlder } = useGetMessages();
  const messages = useSelector((store) => store.messages.messages);
  const authUserId = useSelector((store) => store.user.authUser?._id);
  const selectedRoomChat = useSelector((store) => store.rooms.selectedRoomChat);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const olderGuardRef = useRef(false);
  const didMountToBottomRef = useRef(false);
  const isGroupThread = Boolean(selectedRoomChat?._id);

  const lastOutgoingMessageId = [...messages]
    .reverse()
    .find((message) => normalizeUserId(message.senderID) === normalizeUserId(authUserId))?._id;

  useEffect(() => {
    if (!didMountToBottomRef.current) {
      bottomRef.current?.scrollIntoView();
      didMountToBottomRef.current = true;
      return;
    }

    if (nearBottomRef.current) {
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);

  useEffect(() => {
    didMountToBottomRef.current = false;
  }, [authUserId, selectedRoomChat?._id]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 120;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    if (
      el.scrollTop < 90 &&
      hasMoreOlder &&
      !loadingOlder &&
      !olderGuardRef.current
    ) {
      olderGuardRef.current = true;
      const prevHeight = el.scrollHeight;
      loadOlder()
        .then(() => {
          requestAnimationFrame(() => {
            const box = scrollRef.current;
            if (box) box.scrollTop = box.scrollHeight - prevHeight;
          });
        })
        .finally(() => {
          olderGuardRef.current = false;
        });
    }
  }, [loadOlder, loadingOlder, hasMoreOlder]);

  const daySections = useMemo(() => {
    const sections = [];

    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      const next = messages[index + 1];
      const dayKey = startOfDayKey(message.createdAt);
      const startsCluster =
        !previous ||
        !sameDay(previous.createdAt, message.createdAt) ||
        !sameSender(previous, message);
      const endsCluster =
        !next ||
        !sameDay(next.createdAt, message.createdAt) ||
        !sameSender(next, message);
      const isSender =
        normalizeUserId(message.senderID) === normalizeUserId(authUserId);
      const showSenderName = isGroupThread && !isSender && startsCluster;
      const showStatus = isSender && String(message._id) === String(lastOutgoingMessageId);

      const item = {
        message,
        startsCluster,
        endsCluster,
        showSenderName,
        showStatus,
      };

      const existingSection = sections[sections.length - 1];
      if (existingSection && existingSection.dayKey === dayKey) {
        existingSection.items.push(item);
      } else {
        sections.push({
          dayKey,
          label: formatDayLabel(message.createdAt),
          items: [item],
        });
      }
    });

    return sections;
  }, [messages, authUserId, isGroupThread, lastOutgoingMessageId]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(36,69,52,0.14),transparent_28%)] px-2 pb-2 pt-3 sm:px-5 sm:pb-3 sm:pt-5"
    >
      {loadingOlder ? (
        <p className="mb-3 text-center text-xs text-zinc-500">Loading older messages...</p>
      ) : null}
      {!loadingOlder && hasMoreOlder && messages.length > 0 ? (
        <p className="mb-3 text-center text-[10px] text-zinc-600">Scroll up for older</p>
      ) : null}
      {loadingInitial ? (
        <p className="my-auto text-center text-sm text-zinc-400">Loading messages...</p>
      ) : null}
      {!loadingInitial && messages.length === 0 ? (
        <div className="mx-auto my-auto max-w-sm rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(20,20,21,0.88),rgba(13,13,14,0.82))] px-5 py-7 text-center shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
          <p className="text-sm font-semibold text-white">No messages yet</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {selectedRoomChat
              ? "Start the group with a quick hello or drop a track for everyone."
              : "Start the conversation with something small. A song recommendation works well."}
          </p>
        </div>
      ) : null}

      {!loadingInitial
        ? daySections.map((section) => (
            <section key={section.dayKey} className="relative">
              <div className="mb-4 mt-2 flex justify-center sm:mb-5">
                <span className="inline-flex min-w-[4.75rem] justify-center rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,19,0.94),rgba(10,10,11,0.88))] px-3.5 py-1 text-[11px] font-medium text-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur">
                  {section.label}
                </span>
              </div>

              {section.items.map(({ message, startsCluster, endsCluster, showSenderName, showStatus }) => (
                <Message
                  key={message.clientMessageId || message._id}
                  message={message}
                  isGroupThread={isGroupThread}
                  startsCluster={startsCluster}
                  endsCluster={endsCluster}
                  showSenderName={showSenderName}
                  showStatus={showStatus}
                />
              ))}
            </section>
          ))
        : null}

      <div ref={bottomRef} aria-hidden />
    </div>
  );
};

export default Messages;
