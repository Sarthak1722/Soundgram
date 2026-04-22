import React, { useEffect, useMemo, useRef, useState } from "react";
import SendInput from "./SendInput.jsx";
import Messages from "./Messages.jsx";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  IoArrowBack,
  IoChatbubblesOutline,
  IoEllipsisHorizontal,
  IoMusicalNotes,
  IoPeople,
} from "react-icons/io5";
import { isUserOnline, normalizeUserId } from "../utils/messageConversation.js";
import { useSocket } from "../context/useSocket.js";
import {
  setActiveJam,
  clearActiveJam,
  clearSelectedRoomChat,
  removeRoom,
  setSelectedRoomChat,
  upsertRoom,
} from "../redux/roomsSlice.js";
import { setselectedUser } from "../redux/userSlice.js";
import { markGroupMessagesRead } from "../api/messagesApi.js";
import {
  addRoomMembers as addRoomMembersApi,
  deleteRoom as deleteRoomApi,
  leaveRoom as leaveRoomApi,
  updateRoom as updateRoomApi,
  updateRoomAdmin as updateRoomAdminApi,
} from "../api/roomsApi.js";
import { filterFriendUsers } from "../utils/socialGraph.js";

const MessageContainer = () => {
  const dispatch = useDispatch();
  const { authUser, selectedUser, onlineUsers, otherUsers } = useSelector((store) => store.user);
  const { activeJam, selectedRoomChat } = useSelector((store) => store.rooms);
  const messages = useSelector((store) => store.messages.messages);
  const peerTyping = useSelector((store) => store.messages.peerTyping);
  const groupTypingUsers = useSelector((store) => store.messages.groupTypingUsers);
  const { socket } = useSocket();
  const isOnline = isUserOnline(onlineUsers, selectedUser?._id);
  const isGroupThread = Boolean(selectedRoomChat?._id);
  const currentRoomId = selectedRoomChat?._id ? String(selectedRoomChat._id) : null;
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showRenameGroup, setShowRenameGroup] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [pickedMembers, setPickedMembers] = useState(() => new Set());
  const [savingGroup, setSavingGroup] = useState(false);
  const groupMenuRef = useRef(null);
  const isGroupCreator =
    isGroupThread && String(selectedRoomChat?.createdBy) === String(authUser?._id);
  const isGroupAdmin =
    isGroupThread &&
    (isGroupCreator ||
      (selectedRoomChat?.admins || []).some((adminId) => String(adminId) === String(authUser?._id)));
  const friendUsers = useMemo(() => filterFriendUsers(otherUsers, authUser), [otherUsers, authUser]);
  const availableFriends = useMemo(
    () => (friendUsers.length ? friendUsers : authUser?.friends || []),
    [friendUsers, authUser?.friends],
  );
  const selectableMembers = useMemo(() => {
    if (!selectedRoomChat?._id) return [];
    const currentMemberIds = new Set((selectedRoomChat.members || []).map((member) => String(member._id)));
    return availableFriends.filter((user) => !currentMemberIds.has(String(user._id)));
  }, [availableFriends, selectedRoomChat]);

  const jamWithThisDm =
    activeJam?.kind === "dm" &&
    selectedUser?._id &&
    activeJam.peerId === String(selectedUser._id);
  const groupJamActive = activeJam?.kind === "group";
  const jamWithThisGroup =
    activeJam?.kind === "group" &&
    currentRoomId &&
    String(activeJam.groupId) === currentRoomId;

  const lastPeerMessageId = useMemo(() => {
    if (isGroupThread || !authUser?._id || !selectedUser?._id) return null;
    const peer = normalizeUserId(selectedUser._id);
    for (let i = messages.length - 1; i >= 0; i--) {
      if (normalizeUserId(messages[i].senderID) === peer) {
        return messages[i]._id;
      }
    }
    return null;
  }, [messages, authUser?._id, selectedUser?._id, isGroupThread]);

  useEffect(() => {
    if (isGroupThread || !socket?.connected || !selectedUser?._id) return;
    const t = setTimeout(() => {
      socket.emit("markRead", { withUserId: String(selectedUser._id) });
    }, 400);
    return () => clearTimeout(t);
  }, [socket, selectedUser?._id, lastPeerMessageId, socket?.connected, isGroupThread]);

  useEffect(() => {
    if (!isGroupThread || !socket?.connected || !selectedRoomChat?._id) return;
    const hasUnreadFromOthers = messages.some(
      (message) =>
        String(message.roomID) === String(selectedRoomChat._id) &&
        normalizeUserId(message.senderID) !== normalizeUserId(authUser?._id) &&
        !((message.readBy || []).some((entry) => normalizeUserId(entry.userId) === normalizeUserId(authUser?._id))),
    );
    if (!hasUnreadFromOthers) return;

    const timer = setTimeout(async () => {
      try {
        const payload = await markGroupMessagesRead(String(selectedRoomChat._id));
        if (payload.messageIds.length) {
          socket.emit("groupMessagesRead", {
            roomId: String(selectedRoomChat._id),
            ...payload,
          });
        }
      } catch (error) {
        console.error("markGroupMessagesRead failed", error);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isGroupThread, socket, selectedRoomChat?._id, messages, authUser?._id, socket?.connected]);

  const selectedInitial = selectedUser?.fullName?.[0]?.toUpperCase();
  const typingLabel = groupTypingUsers.length
    ? `${groupTypingUsers[0].userName}${groupTypingUsers.length > 1 ? ` +${groupTypingUsers.length - 1}` : ""} typing…`
    : null;

  useEffect(() => {
    if (!showGroupMenu) return undefined;
    const onClickOutside = (event) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target)) {
        setShowGroupMenu(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showGroupMenu]);

  useEffect(() => {
    setGroupNameDraft(selectedRoomChat?.name || "");
  }, [selectedRoomChat?.name]);

  useEffect(() => {
    setPickedMembers(new Set());
  }, [selectedRoomChat?._id]);

  const syncUpdatedRoom = (room) => {
    dispatch(upsertRoom(room));
    dispatch(setSelectedRoomChat(room));
    if (activeJam?.kind === "group" && String(activeJam.groupId) === String(room._id)) {
      dispatch(
        setActiveJam({
          ...activeJam,
          label: room.name,
          groupId: String(room._id),
          roomId: `group:${room._id}`,
        }),
      );
    }
  };

  const togglePickedMember = (memberId) => {
    setPickedMembers((prev) => {
      const next = new Set(prev);
      const normalized = String(memberId);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  };

  const handleRenameGroup = async (e) => {
    e.preventDefault();
    if (!selectedRoomChat?._id || !groupNameDraft.trim()) {
      toast.error("Add a group name");
      return;
    }
    setSavingGroup(true);
    try {
      const room = await updateRoomApi(selectedRoomChat._id, { name: groupNameDraft.trim() });
      syncUpdatedRoom(room);
      setShowRenameGroup(false);
      setShowGroupMenu(false);
      toast.success("Group renamed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to rename group");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedRoomChat?._id) return;
    setSavingGroup(true);
    try {
      await deleteRoomApi(selectedRoomChat._id);
      dispatch(removeRoom(selectedRoomChat._id));
      dispatch(clearSelectedRoomChat());
      if (activeJam?.kind === "group" && String(activeJam.groupId) === String(selectedRoomChat._id)) {
        dispatch(clearActiveJam());
      }
      setShowGroupMenu(false);
      setShowRenameGroup(false);
      toast.success("Group deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedRoomChat?._id) return;
    setSavingGroup(true);
    try {
      await leaveRoomApi(selectedRoomChat._id);
      dispatch(removeRoom(selectedRoomChat._id));
      dispatch(clearSelectedRoomChat());
      if (activeJam?.kind === "group" && String(activeJam.groupId) === String(selectedRoomChat._id)) {
        dispatch(clearActiveJam());
      }
      setShowGroupMenu(false);
      setShowGroupMembers(false);
      toast.success("You left the group");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleAddMembers = async (e) => {
    e.preventDefault();
    if (!selectedRoomChat?._id || !pickedMembers.size) {
      toast.error("Pick at least one member");
      return;
    }

    setSavingGroup(true);
    try {
      const room = await addRoomMembersApi(selectedRoomChat._id, [...pickedMembers]);
      syncUpdatedRoom(room);
      setPickedMembers(new Set());
      setShowAddMembers(false);
      toast.success("Members added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleToggleAdmin = async (memberId, makeAdmin) => {
    if (!selectedRoomChat?._id) return;
    setSavingGroup(true);
    try {
      const room = await updateRoomAdminApi(selectedRoomChat._id, memberId, makeAdmin);
      syncUpdatedRoom(room);
      toast.success(makeAdmin ? "Admin granted" : "Admin removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update admin");
    } finally {
      setSavingGroup(false);
    }
  };

  const closeThread = () => {
    dispatch(setselectedUser(null));
    dispatch(clearSelectedRoomChat());
  };

  return (
    <>
      {selectedUser !== null || selectedRoomChat ? (
        <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(26,42,34,0.24),transparent_38%),linear-gradient(180deg,rgba(8,8,8,0.95),rgba(6,6,7,0.94))] backdrop-blur-md">
          <div className="sticky top-0 z-10 flex min-h-15 shrink-0 items-center border-b border-white/[0.08] bg-[#111111]/90 px-3 py-2 sm:min-h-16 sm:px-5">
            <button
              type="button"
              onClick={closeThread}
              className="mr-2 rounded-full border border-white/10 bg-white/[0.05] p-2 text-zinc-300 lg:hidden"
              aria-label="Back to inbox"
            >
              <IoArrowBack className="text-base" />
            </button>
            {isGroupThread ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-[18px] bg-gradient-to-br from-emerald-500/35 to-cyan-500/20 text-emerald-200 sm:h-10 sm:w-10 sm:rounded-2xl">
                <IoPeople />
              </div>
            ) : (
              <div className="relative">
                <img src={selectedUser?.profilePhoto} className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10" alt="" />
                {isOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111] bg-emerald-400" />
                ) : null}
              </div>
            )}

            <div className="ml-2.5 min-w-0 flex-1 sm:ml-3">
              <p className="truncate text-sm font-semibold text-white sm:text-[15px]">
                {isGroupThread ? selectedRoomChat?.name : selectedUser?.fullName}
              </p>
              <p className={`truncate text-[11px] ${isGroupThread ? "text-zinc-400" : isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                {isGroupThread
                  ? typingLabel || `${(selectedRoomChat?.members || []).length} members`
                  : peerTyping
                    ? "typing…"
                    : isOnline
                      ? "Online"
                      : "Last seen recently"}
              </p>
              {groupJamActive ? (
                <p className="mt-0.5 truncate text-[10px] text-amber-400/90">
                  Group jam active — switch from your group chats or clear it here.
                </p>
              ) : null}
            </div>
            {!isGroupThread ? (
              <div className="mr-3 hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-zinc-500 xl:block">
                {selectedInitial} • direct line
              </div>
            ) : null}
            {isGroupThread ? (
              <div ref={groupMenuRef} className="relative mr-2">
                <button
                  type="button"
                  onClick={() => setShowGroupMenu((prev) => !prev)}
                  className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-zinc-300 transition hover:bg-white/[0.1] hover:text-white"
                  aria-label="Group options"
                >
                  <IoEllipsisHorizontal className="text-base sm:text-lg" />
                </button>
                {showGroupMenu ? (
                  <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur">
                    <button
                      type="button"
                      onClick={() => {
                        setShowGroupMembers(true);
                        setShowGroupMenu(false);
                      }}
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                    >
                      Members
                    </button>
                    {isGroupAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMembers(true);
                          setShowGroupMenu(false);
                        }}
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                      >
                        Add members
                      </button>
                    ) : null}
                    {isGroupAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowRenameGroup(true);
                          setShowGroupMenu(false);
                        }}
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                      >
                        Rename group
                      </button>
                    ) : null}
                    {!isGroupCreator ? (
                      <button
                        type="button"
                        onClick={handleLeaveGroup}
                        disabled={savingGroup}
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        Leave group
                      </button>
                    ) : null}
                    {isGroupCreator ? (
                      <button
                        type="button"
                        onClick={handleDeleteGroup}
                        disabled={savingGroup}
                        className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete group
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              disabled={groupJamActive && !(isGroupThread ? jamWithThisGroup : jamWithThisDm)}
              onClick={() => {
                if (isGroupThread && selectedRoomChat?._id) {
                  if (jamWithThisGroup) {
                    dispatch(clearActiveJam());
                  } else {
                    dispatch(
                      setActiveJam({
                        kind: "group",
                        roomId: `group:${selectedRoomChat._id}`,
                        groupId: String(selectedRoomChat._id),
                        label: selectedRoomChat.name,
                      }),
                    );
                  }
                  return;
                }

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
              className={`ml-2 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isGroupThread
                  ? jamWithThisGroup
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "bg-white/10 text-zinc-200 hover:bg-white/15"
                  : jamWithThisDm
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-white/10 text-zinc-200 hover:bg-white/15"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <IoMusicalNotes />
              {isGroupThread ? (jamWithThisGroup ? "Group jam on" : "Jam together") : jamWithThisDm ? "DM jam on" : "Jam together"}
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
            Choose one of your added friends from the inbox to start messaging. Direct chats are limited to your friend list now.
          </p>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Quietly active
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              Read receipts, typing states, and jam context are already wired in here.
            </p>
          </div>
        </div>
      )}
      {showRenameGroup && isGroupThread ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(10,10,12,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
              Rename group
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Update group name</h3>
            <form onSubmit={handleRenameGroup} className="mt-5 space-y-4">
              <input
                value={groupNameDraft}
                onChange={(e) => setGroupNameDraft(e.target.value)}
                placeholder="Group name"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-zinc-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenameGroup(false)}
                  className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroup}
                  className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
                >
                  {savingGroup ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showGroupMembers && isGroupThread ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(10,10,12,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
              Group members
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {selectedRoomChat?.name}
            </h3>
            <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">
              {(selectedRoomChat?.members || []).map((member) => {
                const isCreator = String(member?._id) === String(selectedRoomChat?.createdBy);
                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3"
                  >
                    <img
                      src={member.profilePhoto}
                      alt={member.fullName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {member.fullName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">@{member.userName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {((selectedRoomChat?.admins || []).some((adminId) => String(adminId) === String(member?._id)) ||
                        isCreator) ? (
                        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                          {isCreator ? "Creator" : "Admin"}
                        </span>
                      ) : null}
                      {isGroupCreator && !isCreator ? (
                        <button
                          type="button"
                          disabled={savingGroup}
                          onClick={() =>
                            handleToggleAdmin(
                              member._id,
                              !((selectedRoomChat?.admins || []).some(
                                (adminId) => String(adminId) === String(member._id),
                              )),
                            )
                          }
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
                        >
                          {(selectedRoomChat?.admins || []).some((adminId) => String(adminId) === String(member._id))
                            ? "Remove admin"
                            : "Make admin"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowGroupMembers(false)}
              className="mt-5 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      {showAddMembers && isGroupThread ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(10,10,12,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
                  Add members
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Invite more people</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMembers(false)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleAddMembers} className="mt-5 space-y-4">
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                {selectableMembers.length ? (
                  selectableMembers.map((member) => (
                    <label
                      key={member._id}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/[0.06]"
                    >
                      <input
                        type="checkbox"
                        checked={pickedMembers.has(String(member._id))}
                        onChange={() => togglePickedMember(member._id)}
                        className="rounded border-white/20"
                      />
                      <img
                        src={member.profilePhoto}
                        alt={member.fullName}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{member.fullName}</p>
                        <p className="truncate text-xs text-zinc-500">@{member.userName}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                    No more users available to add
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={savingGroup || !pickedMembers.size}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {savingGroup ? "Adding..." : "Add selected members"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default MessageContainer;
