import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  IoDiscOutline,
  IoMusicalNotesOutline,
  IoPersonAddOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { fetchPlaybackTracks } from "../api/playbackApi.js";
import { addFriend, removeFriend } from "../api/userApi.js";
import { setauthUser } from "../redux/userSlice.js";
import useGetOtherUsers from "../hooks/useGetOtherUsers.jsx";
import PlaylistPickerModal from "../components/social/PlaylistPickerModal.jsx";
import { isFriendWithUser } from "../utils/socialGraph.js";

const SearchPage = () => {
  useGetOtherUsers();

  const dispatch = useDispatch();
  const { authUser, otherUsers } = useSelector((store) => store.user);
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [pendingFriendId, setPendingFriendId] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadTracks = async () => {
      try {
        setLoadingTracks(true);
        const nextTracks = await fetchPlaybackTracks();
        if (!cancelled) {
          setTracks(nextTracks);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load songs.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTracks(false);
        }
      }
    };

    void loadTracks();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const isFriendSearch = normalizedQuery.startsWith("@");
  const friendQuery = isFriendSearch ? normalizedQuery.slice(1) : "";

  const friendResults = useMemo(() => {
    if (!friendQuery) return [];
    return (otherUsers || [])
      .filter((user) => user.userName.toLowerCase().includes(friendQuery))
      .slice(0, 10);
  }, [otherUsers, friendQuery]);

  const songResults = useMemo(() => {
    if (!normalizedQuery || isFriendSearch) return [];
    return tracks
      .filter((track) => track.title.toLowerCase().includes(normalizedQuery))
      .slice(0, 12);
  }, [tracks, normalizedQuery, isFriendSearch]);

  const suggestedUsers = useMemo(() => otherUsers || [], [otherUsers]);
  const suggestedTracks = useMemo(() => tracks.slice(0, 6), [tracks]);

  const handleFollow = async (user) => {
    setPendingFriendId(String(user._id));
    try {
      const nextAuthUser = await addFriend(user._id);
      dispatch(setauthUser(nextAuthUser));
      toast.success(`Now following @${user.userName}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not follow this user.");
    } finally {
      setPendingFriendId(null);
    }
  };

  const handleUnfollow = async (user) => {
    setPendingFriendId(String(user._id));
    try {
      const nextAuthUser = await removeFriend(user._id);
      dispatch(setauthUser(nextAuthUser));
      toast.success(`Unfollowed @${user.userName}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not unfollow this user.");
    } finally {
      setPendingFriendId(null);
    }
  };

  const renderUserCard = (user) => {
    const following = isFriendWithUser(authUser, user._id);

    return (
      <div
        key={user._id}
        className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-[#0f0f10] px-4 py-4"
      >
        <Link to={`/homepage/profile/${user._id}`} className="flex min-w-0 flex-1 items-center gap-4">
          <img
            src={user.profilePhoto}
            alt={user.userName}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">@{user.userName}</p>
            <p className="truncate text-sm text-zinc-500">{user.fullName}</p>
          </div>
        </Link>

        {following ? (
          <button
            type="button"
            onClick={() => handleUnfollow(user)}
            disabled={pendingFriendId === String(user._id)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-50"
          >
            Following
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleFollow(user)}
            disabled={pendingFriendId === String(user._id)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
          >
            <IoPersonAddOutline />
            Add friend
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-[#09090a]">
      <div className="w-full max-w-4xl px-4 py-6 sm:px-6">
        <header className="mb-6 border-b border-white/10 pb-5">
          <p className="text-xl font-semibold tracking-tight text-white">Search</p>
          <p className="mt-1 text-sm text-zinc-500">
            Type <span className="text-white">@username</span> to find people, or just type a song name to find music.
          </p>

          <div className="mt-5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3">
            <label className="flex items-center gap-3">
              <IoSearchOutline className="text-lg text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search @username or song title"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
            </label>
          </div>
        </header>

        {!normalizedQuery ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[30px] border border-white/10 bg-[#0f0f10] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">Suggestions for you</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Discover people across the app and connect faster.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  People
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {suggestedUsers.length ? (
                  suggestedUsers.map(renderUserCard)
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-14 text-center text-sm text-zinc-500">
                    No users to suggest yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-[#0f0f10] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">Song picks</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Quick additions from the shared library.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Music
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {loadingTracks ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-14 text-center text-sm text-zinc-500">
                    Loading songs...
                  </div>
                ) : suggestedTracks.length ? (
                  suggestedTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-300">
                        <IoDiscOutline className="text-lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                        <p className="truncate text-sm text-zinc-500">{track.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTrack(track)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                      >
                        Add
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-14 text-center text-sm text-zinc-500">
                    No songs available right now.
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : isFriendSearch ? (
          <section className="space-y-3">
            {friendResults.length ? (
              friendResults.map(renderUserCard)
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-16 text-center text-sm text-zinc-500">
                No users matched that username.
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            {loadingTracks ? (
              <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-16 text-center text-sm text-zinc-500">
                Loading songs...
              </div>
            ) : songResults.length ? (
              songResults.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-[#0f0f10] px-4 py-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-300">
                    <IoMusicalNotesOutline className="text-xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                    <p className="truncate text-sm text-zinc-500">{track.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTrack(track)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                  >
                    Add to playlist
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-16 text-center text-sm text-zinc-500">
                No songs matched that title.
              </div>
            )}
          </section>
        )}

        <PlaylistPickerModal
          open={Boolean(selectedTrack)}
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
      </div>
    </div>
  );
};

export default SearchPage;
