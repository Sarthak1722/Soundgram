import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { IoPeople, IoAddCircleOutline, IoMusicalNotes } from "react-icons/io5";
import { listRooms, createRoom } from "../api/roomsApi.js";
import { setRoomsList, setActiveJam, clearActiveJam } from "../redux/roomsSlice.js";
import useGetOtherUsers from "../hooks/useGetOtherUsers.jsx";

const RoomsPage = () => {
  useGetOtherUsers();
  const dispatch = useDispatch();
  const { authUser, otherUsers } = useSelector((s) => s.user);
  const { list: rooms, activeJam } = useSelector((s) => s.rooms);

  const [name, setName] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  const others = useMemo(
    () => (otherUsers || []).filter((u) => String(u._id) !== String(authUser?._id)),
    [otherUsers, authUser?._id],
  );

  const refresh = async () => {
    try {
      const data = await listRooms();
      dispatch(setRoomsList(data));
    } catch (e) {
      console.error(e);
      toast.error("Could not load rooms");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleMember = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      const s = String(id);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name your room");
      return;
    }
    if (picked.size < 1) {
      toast.error("Pick at least one person");
      return;
    }
    setLoading(true);
    try {
      await createRoom({ name: name.trim(), memberIds: [...picked] });
      toast.success("Room created");
      setName("");
      setPicked(new Set());
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  const enterGroupJam = (room) => {
    dispatch(
      setActiveJam({
        kind: "group",
        roomId: `group:${room._id}`,
        groupId: String(room._id),
        label: room.name,
      }),
    );
    toast.success(`Jam room: ${room.name}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="border-b border-white/[0.06] px-6 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <IoPeople className="text-emerald-400" />
          Jam rooms
        </h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-400">
          Create a group, invite people, then hit <strong>Enter jam</strong>. Playback syncs for
          everyone in that Socket.IO room — same controls as a DM jam.
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-10 px-6 py-8">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            <IoAddCircleOutline />
            New room
          </h2>
          <form onSubmit={onCreate} className="mt-4 space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Room name (e.g. Friday vibes)"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Add members</p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
                {others.length === 0 ? (
                  <p className="text-sm text-zinc-500">No other users yet.</p>
                ) : (
                  others.map((u) => (
                    <label
                      key={u._id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.06]"
                    >
                      <input
                        type="checkbox"
                        checked={picked.has(String(u._id))}
                        onChange={() => toggleMember(u._id)}
                        className="rounded border-white/20"
                      />
                      <img src={u.profilePhoto} alt="" className="h-8 w-8 rounded-full" />
                      <span className="text-sm text-white">{u.fullName}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create room"}
            </button>
          </form>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
              Your rooms
            </h2>
            {activeJam ? (
              <button
                type="button"
                onClick={() => {
                  dispatch(clearActiveJam());
                  toast.success("Left jam context");
                }}
                className="text-xs font-medium text-zinc-400 underline hover:text-white"
              >
                Clear active jam
              </button>
            ) : null}
          </div>
          {activeJam ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <span className="flex items-center gap-2 font-medium">
                <IoMusicalNotes />
                Active jam:{" "}
                {activeJam.kind === "group" ? activeJam.label : `DM · ${activeJam.label}`}
              </span>
              <p className="mt-1 text-xs text-emerald-200/80">
                Use the bottom player — controls broadcast to this room only.
              </p>
            </div>
          ) : null}

          <ul className="space-y-3">
            {rooms.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
                No rooms yet. Create one above.
              </li>
            ) : (
              rooms.map((room) => (
                <li
                  key={room._id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">{room.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(room.members || []).length} members · id {room._id}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(room.members || []).map((m) => (
                        <span
                          key={m._id}
                          className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300"
                        >
                          {m.fullName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => enterGroupJam(room)}
                    className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100"
                  >
                    Enter jam
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default RoomsPage;
