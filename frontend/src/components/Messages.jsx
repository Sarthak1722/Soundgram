import React, { useEffect, useRef, useCallback } from "react";
import Message from "./Message.jsx";
import useGetMessages from "../hooks/useGetMessages";
import { useSelector } from "react-redux";

const Messages = () => {
  const { loadingInitial, loadingOlder, loadOlder, hasMoreOlder } = useGetMessages();
  const messages = useSelector((store) => store.messages.messages);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const olderGuardRef = useRef(false);

  useEffect(() => {
    if (nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-6"
    >
      {loadingOlder ? (
        <p className="text-center text-xs text-zinc-500">Loading older messages…</p>
      ) : null}
      {!loadingOlder && hasMoreOlder && messages.length > 0 ? (
        <p className="text-center text-[10px] text-zinc-600">Scroll up for older</p>
      ) : null}
      {loadingInitial ? (
        <p className="text-center text-sm text-zinc-400">Loading messages…</p>
      ) : null}
      {messages?.map((m) => (
        <Message key={m.clientMessageId || m._id} message={m} />
      ))}
      <div ref={bottomRef} aria-hidden />
    </div>
  );
};

export default Messages;
