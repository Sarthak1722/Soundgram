import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoAdd,
  IoCheckmark,
  IoChevronForward,
  IoEllipsisHorizontal,
  IoHeart,
  IoMusicalNotesOutline,
  IoPause,
  IoPlay,
  IoTimeOutline,
} from "react-icons/io5";
import { useSelector } from "react-redux";
import { usePlaybackActions } from "../components/playback/usePlaybackActions.js";
import { fetchPlaybackTracks } from "../api/playbackApi.js";
import {
  addTrackToPlaylist,
  createPlaylist,
  fetchUserPlaylists,
  removeTrackFromPlaylist,
} from "../api/playlistsApi.js";
import UploadSongModal from "../components/social/UploadSongModal.jsx";

const LIKED_SONGS_NAME = "Liked Songs";

const isLikedSongsPlaylist = (playlist) =>
  playlist?.name?.trim().toLowerCase() === LIKED_SONGS_NAME.toLowerCase();

const getPlaylistTracks = (playlist) =>
  Array.isArray(playlist?.tracks)
    ? playlist.tracks
    : Array.isArray(playlist?.songs)
      ? playlist.songs
      : [];

const buildTrackPayload = (track) => ({
  trackId: track.id,
  title: track.title,
  artist: track.artist,
  album: track.album,
  url: track.url,
  duration: track.duration,
  durationSeconds: track.durationSeconds,
});

const LikedMusicPage = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToPlaylist, setAddingToPlaylist] = useState(null);
  const [likedActionTrackId, setLikedActionTrackId] = useState(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState(null);
  const [openPlaylistSubmenuTrackId, setOpenPlaylistSubmenuTrackId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isCompactMobile, setIsCompactMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < 390,
  );
  const playback = useSelector((s) => s.playback);
  const { emitPlaySelection, emitPlay, emitPause } = usePlaybackActions();

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsCompactMobile(window.innerWidth < 390);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tracksData, playlistsData] = await Promise.all([
        fetchPlaybackTracks(),
        fetchUserPlaylists(),
      ]);
      setTracks(tracksData);
      setPlaylists(playlistsData);
    } catch (err) {
      console.error(err);
      setError("Failed to load songs and playlists");
    } finally {
      setLoading(false);
    }
  };

  const likedSongsPlaylist = useMemo(
    () => playlists.find((playlist) => isLikedSongsPlaylist(playlist)) || null,
    [playlists],
  );

  const likedTrackIds = useMemo(() => {
    const ids = new Set();
    for (const track of getPlaylistTracks(likedSongsPlaylist)) {
      const trackId = String(track?.trackId ?? track?.id ?? track?._id ?? "");
      if (trackId) {
        ids.add(trackId);
      }
    }
    return ids;
  }, [likedSongsPlaylist]);

  const customPlaylists = useMemo(
    () => playlists.filter((playlist) => !isLikedSongsPlaylist(playlist)),
    [playlists],
  );

  useEffect(() => {
    if (!openMenuTrackId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest("[data-song-actions]")) {
        setOpenMenuTrackId(null);
        setOpenPlaylistSubmenuTrackId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenuTrackId]);

  const ensureLikedSongsPlaylist = async () => {
    const existingPlaylist = playlists.find((playlist) => isLikedSongsPlaylist(playlist));
    if (existingPlaylist) {
      return existingPlaylist;
    }

    const createdPlaylist = await createPlaylist({
      name: LIKED_SONGS_NAME,
      description: "Quick saves from your song library.",
      gradient: "from-indigo-500 via-violet-500 to-cyan-300",
    });

    if (!createdPlaylist) {
      throw new Error("Failed to create liked songs playlist");
    }

    setPlaylists((current) => [createdPlaylist, ...current]);
    return createdPlaylist;
  };

  const replacePlaylistInState = (updatedPlaylist) => {
    setPlaylists((current) => {
      const exists = current.some((playlist) => playlist.id === updatedPlaylist.id);
      if (!exists) {
        return [updatedPlaylist, ...current];
      }

      return current.map((playlist) => (playlist.id === updatedPlaylist.id ? updatedPlaylist : playlist));
    });
  };

  const handleQuickAddToLikedSongs = async (track) => {
    if (likedTrackIds.has(String(track.id))) {
      return;
    }

    try {
      setLikedActionTrackId(String(track.id));
      setError(null);
      const likedPlaylist = await ensureLikedSongsPlaylist();
      const updatedPlaylist = await addTrackToPlaylist(likedPlaylist.id, buildTrackPayload(track));
      if (updatedPlaylist) {
        replacePlaylistInState(updatedPlaylist);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add song to Liked Songs");
    } finally {
      setLikedActionTrackId(null);
    }
  };

  const handleToggleLikedSong = async (track) => {
    try {
      setLikedActionTrackId(String(track.id));
      setError(null);

      if (likedTrackIds.has(String(track.id))) {
        if (!likedSongsPlaylist) {
          return;
        }

        await removeTrackFromPlaylist(likedSongsPlaylist.id, track.id);
        replacePlaylistInState({
          ...likedSongsPlaylist,
          tracks: getPlaylistTracks(likedSongsPlaylist).filter(
            (playlistTrack) => String(playlistTrack.trackId ?? playlistTrack.id) !== String(track.id),
          ),
          songs: getPlaylistTracks(likedSongsPlaylist).filter(
            (playlistTrack) => String(playlistTrack.trackId ?? playlistTrack.id) !== String(track.id),
          ),
          trackIds: (likedSongsPlaylist.trackIds || []).filter((trackId) => String(trackId) !== String(track.id)),
          trackCount: Math.max((likedSongsPlaylist.trackCount || 1) - 1, 0),
        });
      } else {
        const likedPlaylist = await ensureLikedSongsPlaylist();
        const updatedPlaylist = await addTrackToPlaylist(likedPlaylist.id, buildTrackPayload(track));
        if (updatedPlaylist) {
          replacePlaylistInState(updatedPlaylist);
        }
      }

      setOpenMenuTrackId(null);
      setOpenPlaylistSubmenuTrackId(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update Liked Songs");
    } finally {
      setLikedActionTrackId(null);
    }
  };

  const handleAddToPlaylist = async (track, playlistId) => {
    try {
      setAddingToPlaylist(`${track.id}-${playlistId}`);
      setError(null);
      const updatedPlaylist = await addTrackToPlaylist(playlistId, buildTrackPayload(track));
      if (updatedPlaylist) {
        replacePlaylistInState(updatedPlaylist);
      }
      setOpenMenuTrackId(null);
      setOpenPlaylistSubmenuTrackId(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to add track to playlist");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handlePlayTrack = (track, trackIndex) => {
    const isCurrent = playback.currentTrack?.id === track.id;
    if (isCurrent) {
      if (playback.isPlaying) emitPause();
      else emitPlay();
    } else {
      emitPlaySelection(tracks, trackIndex);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-emerald-900/20 to-transparent px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-500 to-green-800 shadow-2xl shadow-emerald-950/50 sm:h-32 sm:w-32 md:h-40 md:w-40 md:rounded-[28px]">
                <IoHeart className="text-4xl text-white/90 drop-shadow-lg sm:text-5xl md:text-6xl" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400 sm:text-xs sm:tracking-widest">
                  Songs
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                  Available Songs
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  {loading ? "Loading..." : `${tracks.length} songs available`}
                </p>
              </div>
            </div>

            <div className="flex sm:justify-start lg:justify-end">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09] sm:w-auto sm:rounded-full sm:px-5"
              >
                <IoAdd className="text-base" />
                <span>Add Song</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-8">
        <div className="mx-auto max-w-5xl">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-500 bg-red-900/40 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {isCompactMobile ? (
            <section className="mb-5 rounded-[28px] border border-white/10 bg-[#0f0f10] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">Your playlists</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Open and manage playlists from here on smaller screens.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/homepage/playlists")}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  View all
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {customPlaylists.length ? (
                  customPlaylists.slice(0, 4).map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => navigate(`/homepage/playlists/${playlist.id}`)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.05]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-300">
                        <IoMusicalNotesOutline className="text-lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {getPlaylistTracks(playlist).length} songs
                        </p>
                      </div>
                      <IoChevronForward className="shrink-0 text-sm text-zinc-500" />
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/homepage/playlists")}
                    className="w-full rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500 transition hover:bg-white/[0.03]"
                  >
                    No playlists yet. Open playlists to create one.
                  </button>
                )}
              </div>
            </section>
          ) : null}

          <div className="flex gap-3 border-b border-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="w-8 shrink-0 text-center">#</span>
            <span className="min-w-0 flex-1">Title</span>
            <span className="hidden min-w-0 flex-1 sm:block">Album</span>
            <span className="flex w-14 shrink-0 items-center justify-end">
              <IoTimeOutline className="text-base" />
            </span>
            <span className="w-12 shrink-0" />
          </div>

          <ul className="divide-y divide-white/[0.04]">
            {tracks.map((track, index) => (
              <li
                key={track.id}
                onClick={() => handlePlayTrack(track, index)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/[0.06]"
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500">
                  <span className="tabular-nums">{index + 1}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-zinc-400">{track.artist}</p>
                  </div>
                </div>
                <p className="hidden min-w-0 flex-1 truncate text-zinc-400 sm:block">
                  {track.album || "Unknown"}
                </p>
                <p className="w-14 shrink-0 text-right tabular-nums text-zinc-500">
                  {track.duration || "—"}
                </p>
                <div className="flex w-28 shrink-0 items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handlePlayTrack(track, index);
                    }}
                    className="rounded p-1 text-zinc-400 transition hover:text-white"
                    aria-label="Play track"
                  >
                    {playback.currentTrack?.id === track.id && playback.isPlaying ? (
                      <IoPause className="text-lg" />
                    ) : (
                      <IoPlay className="text-lg" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleQuickAddToLikedSongs(track);
                    }}
                    disabled={likedActionTrackId === String(track.id) || likedTrackIds.has(String(track.id))}
                    className={`rounded p-1 transition ${
                      likedTrackIds.has(String(track.id))
                        ? "text-emerald-400"
                        : "text-zinc-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-white"
                    } disabled:cursor-default disabled:opacity-100`}
                    aria-label={
                      likedTrackIds.has(String(track.id)) ? "Already in Liked Songs" : "Add to Liked Songs"
                    }
                  >
                    {likedTrackIds.has(String(track.id)) ? (
                      <IoCheckmark className="text-lg" />
                    ) : (
                      <IoAdd className="text-lg" />
                    )}
                  </button>
                  <div className="relative" data-song-actions="true">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const nextTrackId = openMenuTrackId === track.id ? null : track.id;
                        setOpenMenuTrackId(nextTrackId);
                        setOpenPlaylistSubmenuTrackId(nextTrackId ? null : openPlaylistSubmenuTrackId);
                      }}
                      className="rounded p-1 text-zinc-400 transition hover:text-white"
                      aria-label="More song actions"
                    >
                      <IoEllipsisHorizontal className="text-lg" />
                    </button>
                    {openMenuTrackId === track.id ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleLikedSong(track);
                          }}
                          disabled={likedActionTrackId === String(track.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                        >
                          <span>
                            {likedTrackIds.has(String(track.id))
                              ? "Remove from Liked Songs"
                              : "Add to Liked Songs"}
                          </span>
                          {likedTrackIds.has(String(track.id)) ? (
                            <IoCheckmark className="text-base text-emerald-400" />
                          ) : null}
                        </button>

                        <div
                          className="relative"
                          onMouseEnter={() => setOpenPlaylistSubmenuTrackId(String(track.id))}
                          onMouseLeave={() => setOpenPlaylistSubmenuTrackId((current) =>
                            current === String(track.id) ? null : current,
                          )}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenPlaylistSubmenuTrackId((current) =>
                                current === String(track.id) ? null : String(track.id),
                              );
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/[0.08]"
                          >
                            <span>Add to playlist</span>
                            <IoChevronForward className="text-sm text-zinc-400" />
                          </button>

                          {openPlaylistSubmenuTrackId === String(track.id) ? (
                            <div className="absolute right-full top-0 mr-2 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
                              {customPlaylists.length === 0 ? (
                                <p className="px-3 py-2 text-sm text-zinc-500">No playlists yet</p>
                              ) : (
                                customPlaylists.map((playlist) => {
                                  const alreadyInPlaylist = getPlaylistTracks(playlist).some(
                                    (playlistTrack) =>
                                      String(playlistTrack.trackId ?? playlistTrack.id) === String(track.id),
                                  );

                                  return (
                                    <button
                                      key={playlist.id}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (alreadyInPlaylist) {
                                          return;
                                        }
                                        void handleAddToPlaylist(track, playlist.id);
                                      }}
                                      disabled={
                                        alreadyInPlaylist || addingToPlaylist === `${track.id}-${playlist.id}`
                                      }
                                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/[0.08] disabled:cursor-default disabled:opacity-50"
                                    >
                                      <span className="truncate">{playlist.name}</span>
                                      {alreadyInPlaylist ? (
                                        <IoCheckmark className="text-base text-emerald-400" />
                                      ) : null}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <UploadSongModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onTrackUploaded={(uploadedTrack) => {
          setTracks((current) => [uploadedTrack, ...current.filter((track) => track.id !== uploadedTrack.id)]);
        }}
      />
    </div>
  );
};

export default LikedMusicPage;
