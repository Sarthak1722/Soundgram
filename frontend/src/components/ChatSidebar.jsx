import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { IoAdd, IoChatbubbles, IoPeople } from "react-icons/io5";
import OtherUsers from "./OtherUsers.jsx";
import { createRoom } from "../api/roomsApi.js";
import { setselectedUser } from "../redux/userSlice.js";
import { setRoomsList, setSelectedRoomChat } from "../redux/roomsSlice.js";
import { filterFriendUsers } from "../utils/socialGraph.js";

const ChatSidebar = () => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [creating, setCreating] = useState(false);
  const { authUser, otherUsers, onlineUsers } = useSelector((store) => store.user);
  const { list: rooms, selectedRoomChat } = useSelector((store) => store.rooms);

  const friendUsers = useMemo(() => filterFriendUsers(otherUsers, authUser), [otherUsers, authUser]);
  const directMessageUsers = useMemo(
    () => (friendUsers.length ? friendUsers : authUser?.friends || []),
    [friendUsers, authUser?.friends],
  );
  const filteredUsers = useMemo(
    () =>
      directMessageUsers.filter((user) =>
        `${user.fullName} ${user.userName}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [directMessageUsers, search],
  );
  const filteredRooms = useMemo(
    () =>
      (rooms || []).filter((room) => room.name?.toLowerCase().includes(search.toLowerCase())),
    [rooms, search],
  );
  const onlineFriendCount = directMessageUsers.filter((user) =>
    (onlineUsers || []).some((onlineUserId) => String(onlineUserId) === String(user._id)),
  ).length;

  const toggleMember = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      const normalized = String(id);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  };

  const closeModal = () => {
    setShowCreateGroup(false);
    setGroupName("");
    setPicked(new Set());
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Add a group name");
      return;
    }
    if (picked.size < 1) {
      toast.error("Pick at least one other friend");
      return;
    }

    setCreating(true);
    try {
      const room = await createRoom({ name: groupName.trim(), memberIds: [...picked] });
      dispatch(
        setRoomsList([room, ...(rooms || []).filter((entry) => String(entry._id) !== String(room._id))]),
      );
      dispatch(setselectedUser(null));
      dispatch(setSelectedRoomChat(room));
      toast.success("Group chat created");
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const selectRoom = (room) => {
    dispatch(setselectedUser(null));
    dispatch(setSelectedRoomChat(room));
  };

  return (
    <div className="relative flex min-h-0 w-full shrink-0 flex-col border-r border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,9,10,0.95),rgba(7,7,8,0.92))] backdrop-blur-xl lg:w-[320px]">
      <div className="border-b border-white/[0.08] px-3.5 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
              Inbox
            </h2>
            <p className="mt-1 text-[15px] font-semibold text-zinc-100 sm:text-sm">
              Direct messages & groups
            </p>
            <p className="mt-1 text-xs text-zinc-500 lg:hidden">
              Jump between chats while your jam keeps playing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-200 transition hover:bg-white/[0.1]"
          >
            <IoAdd className="text-[13px]" />
            Group
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
          {onlineFriendCount} friend{onlineFriendCount === 1 ? "" : "s"} active now
        </div>
      </div>

      <div className="space-y-2.5 p-3 sm:p-4">
        <input
          type="text"
          placeholder="Search people or groups..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.25 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3 sm:px-4 sm:pb-4">
        <div className="pb-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            <IoPeople />
            Groups
          </div>
          <div className="space-y-2">
            {filteredRooms.length ? (
              filteredRooms.map((room) => {
                const isSelected = String(selectedRoomChat?._id) === String(room._id);
                return (
                  <button
                    key={room._id}
                    type="button"
                    onClick={() => selectRoom(room)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      isSelected ? "bg-white/18 ring-1 ring-white/12" : "bg-white/[0.03] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-emerald-500/35 to-cyan-500/20 text-emerald-200">
                      <IoChatbubbles />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{room.name}</p>
                      <p className="text-xs text-zinc-400">
                        {(room.members || []).length} members
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-zinc-500">
                No groups yet
              </div>
            )}
          </div>
        </div>
        <div className="pb-2">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            <IoChatbubbles />
            Direct messages
          </div>
        </div>
        <OtherUsers users={search ? filteredUsers : directMessageUsers} />
      </div>

      {showCreateGroup ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(10,10,12,0.98))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
                  New group
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Create a group chat</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-5 space-y-4">
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-zinc-500"
              />
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Add friends
                </p>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  {directMessageUsers.length ? (
                    directMessageUsers.map((user) => (
                      <label
                        key={user._id}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/[0.06]"
                      >
                        <input
                          type="checkbox"
                          checked={picked.has(String(user._id))}
                          onChange={() => toggleMember(user._id)}
                          className="rounded border-white/20"
                        />
                        <img
                          src={user.profilePhoto}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{user.fullName}</p>
                          <p className="truncate text-xs text-zinc-500">@{user.userName}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                      No friends available yet
                    </div>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {creating ? "Creating group..." : "Create group chat"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ChatSidebar;
