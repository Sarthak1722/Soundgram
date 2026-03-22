import React, { useEffect, useMemo } from "react";
import SendInput from "./SendInput.jsx";
import Messages from "./Messages.jsx";
import { useSelector, useDispatch } from "react-redux";
import { IoChatbubblesOutline, IoMusicalNotes } from "react-icons/io5";
import { isUserOnline, normalizeUserId } from "../utils/messageConversation.js";
import { useSocket } from "../context/SocketContext.jsx";
import { setActiveJam, clearActiveJam } from "../redux/roomsSlice.js";

const MessageContainer = () => {
  const dispatch = useDispatch();
  const { authUser, selectedUser, onlineUsers } = useSelector((store) => store.user);
  const activeJam = useSelector((store) => store.rooms.activeJam);
  const messages = useSelector((store) => store.messages.messages);
  const peerTyping = useSelector((store) => store.messages.peerTyping);
  const { socket } = useSocket();
  const isOnline = isUserOnline(onlineUsers, selectedUser?._id);

  const jamWithThisDm =
    activeJam?.kind === "dm" &&
    selectedUser?._id &&
    activeJam.peerId === String(selectedUser._id);
  const groupJamActive = activeJam?.kind === "group";

  const lastPeerMessageId = useMemo(() => {
    if (!authUser?._id || !selectedUser?._id) return null;
    const peer = normalizeUserId(selectedUser._id);
    for (let i = messages.length - 1; i >= 0; i--) {
      if (normalizeUserId(messages[i].senderID) === peer) {
        return messages[i]._id;
      }
    }
    return null;
  }, [messages, authUser?._id, selectedUser?._id]);

  useEffect(() => {
    if (!socket?.connected || !selectedUser?._id) return;
    const t = setTimeout(() => {
      socket.emit("markRead", { withUserId: String(selectedUser._id) });
    }, 400);
    return () => clearTimeout(t);
  }, [socket, selectedUser?._id, lastPeerMessageId, socket?.connected]);

  return (
    <>
      {selectedUser !== null ? (
        <div className="flex min-h-0 flex-1 flex-col bg-[#080808]/30 backdrop-blur-md">
          <div
            className="
        flex h-16 shrink-0 items-center
        border-b border-white/[0.08]
        bg-white/[0.06]
        px-6
        "
          >
            <img src={selectedUser?.profilePhoto} className="h-9 w-9 rounded-full" alt="" />

            <div className="ml-3 min-w-0 flex-1">
              <p className="font-medium text-white">{selectedUser?.fullName}</p>
              <p className={`text-xs ${isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                {peerTyping
                  ? "typing…"
                  : isOnline
                    ? "Online"
                    : "Last seen recently"}
              </p>
              {groupJamActive ? (
                <p className="mt-1 text-[10px] text-amber-400/90">
                  Group jam active — use Jam rooms to switch or clear.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={groupJamActive}
              onClick={() => {
                if (jamWithThisDm) {
                  dispatch(clearActiveJam());
                } else if (selectedUser?._id) {
                  dispatch(
                    setActiveJam({
                      kind: "dm",
                      peerId: String(selectedUser._id),
                      label: selectedUser.fullName,
                    }),
                  );
                }
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                jamWithThisDm
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-white/10 text-zinc-200 hover:bg-white/15"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <IoMusicalNotes />
              {jamWithThisDm ? "DM jam on" : "Jam together"}
            </button>
          </div>

          <Messages />

          <SendInput />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#080808]/40 px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-violet-500/20 ring-1 ring-white/10">
            <IoChatbubblesOutline className="text-4xl text-zinc-300" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Hi, {authUser?.fullName}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
            Choose someone from your inbox to start messaging. Your chats stay on this screen only.
          </p>
        </div>
      )}
    </>
  );
};

export default MessageContainer;
