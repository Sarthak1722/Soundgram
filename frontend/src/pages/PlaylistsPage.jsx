import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  IoAdd,
  IoAlbums,
  IoCheckmark,
  IoClose,
  IoEllipsisHorizontal,
  IoHeart,
  IoMusicalNotes,
  IoPause,
  IoPencil,
  IoPlay,
  IoSearchOutline,
  IoTimeOutline,
  IoTrash,
} from "react-icons/io5";
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchUserPlaylists,
  updatePlaylist,
  removeTrackFromPlaylist,
} from "../api/playlistsApi.js";
import { fetchPlaybackTracks } from "../api/playbackApi.js";
import { usePlaybackActions } from "../components/playback/usePlaybackActions.js";

const coverGradients = [
  "from-violet-700 via-indigo-600 to-slate-950",
  "from-emerald-500 via-emerald-700 to-zinc-950",
  "from-fuchsia-600 via-purple-700 to-zinc-950",
  "from-sky-500 via-blue-700 to-zinc-950",
  "from-amber-500 via-orange-700 to-zinc-950",
];

const getPlaylistTracks = (playlist) => {
  if (Array.isArray(playlist?.songs)) return playlist.songs;
  if (Array.isArray(playlist?.tracks)) return playlist.tracks;
  return [];
};

const resolveGradient = (playlist, index = 0) =>
  playlist?.gradient || coverGradients[index % coverGradients.length];

const formatTrackCount = (count) => `${count} song${count === 1 ? "" : "s"}`;

const formatAddedDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const PlaylistCover = ({ playlist, index = 0, className = "" }) => {
  const gradient = resolveGradient(playlist, index);
  const isLikedStyle = /liked/i.test(playlist?.name || "");

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br ${gradient} ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
      <div className="relative flex h-full w-full items-center justify-center text-white">
        {isLikedStyle ? <IoHeart className="text-[38%]" /> : <IoMusicalNotes className="text-[38%]" />}
      </div>
    </div>
  );
};

function PlaylistsPage() {
  const navigate = useNavigate();
  const { emitPlaySelection, emitPlay, emitPause } = usePlaybackActions();
  const authUser = useSelector((store) => store.user.authUser);
  const playback = useSelector((store) => store.playback);
  const [playlists, setPlaylists] = useState([]);
  const [availableTracks, setAvailableTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [openMenuPlaylistId, setOpenMenuPlaylistId] = useState(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState(null);
  const [trackSearch, setTrackSearch] = useState("");
  const [removingTrackId, setRemovingTrackId] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1024,
  );
  const menuRef = useRef(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!playlists.length) {
      setSelectedPlaylistId(null);
      return;
    }

    const selectedStillExists = playlists.some(
      (playlist) => String(playlist.id) === String(selectedPlaylistId),
    );

    if (!selectedStillExists) {
      setSelectedPlaylistId(playlists[0].id);
    }
  }, [playlists, selectedPlaylistId]);

  useEffect(() => {
    setOpenMenuPlaylistId(null);
    setEditingPlaylistId(null);
    setEditingName("");
    setShowAddSongsModal(false);
    setTrackSearch("");
  }, [selectedPlaylistId]);

  useEffect(() => {
    if (!openMenuPlaylistId) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuPlaylistId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuPlaylistId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [playlistsData, tracksData] = await Promise.all([
        fetchUserPlaylists(),
        fetchPlaybackTracks(),
      ]);
      setPlaylists(playlistsData);
      setAvailableTracks(tracksData);
    } catch (err) {
      console.error(err);
      setError("Failed to load playlists and songs.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaylists = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    if (!query) return playlists;
    return playlists.filter((playlist) =>
      `${playlist.name} ${playlist.description || ""}`.toLowerCase().includes(query),
    );
  }, [playlists, libraryQuery]);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => String(playlist.id) === String(selectedPlaylistId)) || null,
    [playlists, selectedPlaylistId],
  );

  const selectedTracks = useMemo(
    () => getPlaylistTracks(selectedPlaylist),
    [selectedPlaylist],
  );

  const trackOptions = useMemo(() => {
    const trackIds = new Set(selectedTracks.map((track) => track.trackId || track.id));
    const query = trackSearch.trim().toLowerCase();

    return availableTracks.filter((track) => {
      if (trackIds.has(track.id)) return false;
      if (!query) return true;
      return `${track.title} ${track.artist} ${track.album || ""}`.toLowerCase().includes(query);
    });
  }, [availableTracks, selectedTracks, trackSearch]);

  const libraryStats = useMemo(() => {
    const songCount = playlists.reduce((total, playlist) => total + getPlaylistTracks(playlist).length, 0);
    return {
      playlistCount: playlists.length,
      songCount,
    };
  }, [playlists]);

  const handleCreatePlaylist = async () => {
    try {
      setCreatingPlaylist(true);
      const gradient = coverGradients[playlists.length % coverGradients.length];
      const newPlaylist = await createPlaylist({
        name: `My Playlist #${playlists.length + 1}`,
        description: "Fresh picks from your library",
        gradient,
      });

      if (newPlaylist) {
        setPlaylists((current) => [newPlaylist, ...current]);
        setSelectedPlaylistId(newPlaylist.id);
        if (!isDesktop) {
          navigate(`/homepage/playlists/${newPlaylist.id}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create playlist.");
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handlePlayPlaylist = () => {
    if (!selectedPlaylist || !selectedTracks.length) {
      setError("This playlist is empty. Add songs before playing.");
      return;
    }

    emitPlaySelection(selectedTracks, 0);
  };

  const handlePlayTrack = (trackIndex) => {
    if (!selectedPlaylist || !selectedTracks.length) return;

    const track = selectedTracks[trackIndex];
    if (playback.currentTrack?.id === track.trackId) {
      playback.isPlaying ? emitPause() : emitPlay();
      return;
    }

    emitPlaySelection(selectedTracks, trackIndex);
  };

  const handleStartRename = (playlist = selectedPlaylist) => {
    if (!playlist) return;
    setEditingPlaylistId(playlist.id);
    setEditingName(playlist.name);
    setOpenMenuPlaylistId(null);
  };

  const handleCancelRename = () => {
    setEditingPlaylistId(null);
    setEditingName("");
  };

  const handleSaveRename = async () => {
    const playlistToRename =
      playlists.find((playlist) => String(playlist.id) === String(editingPlaylistId)) || selectedPlaylist;
    if (!playlistToRename) return;

    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("Playlist name cannot be empty.");
      return;
    }

    try {
      const updated = await updatePlaylist(playlistToRename.id, { name: trimmed });
      if (updated) {
        setPlaylists((current) =>
          current.map((playlist) => (playlist.id === updated.id ? updated : playlist)),
        );
        setEditingPlaylistId(null);
        setEditingName("");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to rename playlist.");
    }
  };

  const handleDeletePlaylist = async () => {
    if (!showDeleteConfirm) return;

    try {
      await deletePlaylist(showDeleteConfirm);
      setPlaylists((current) => current.filter((playlist) => playlist.id !== showDeleteConfirm));
      setShowDeleteConfirm(null);
      setOpenMenuPlaylistId(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete playlist.");
    }
  };

  const handleAddTrack = async (track) => {
    if (!selectedPlaylist || !track?.id) return;

    try {
      setAddingTrackId(track.id);
      const updatedPlaylist = await addTrackToPlaylist(selectedPlaylist.id, {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        url: track.url,
        duration: track.duration,
        durationSeconds: track.durationSeconds,
      });

      if (updatedPlaylist) {
        setPlaylists((current) =>
          current.map((playlist) => (playlist.id === updatedPlaylist.id ? updatedPlaylist : playlist)),
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add song to playlist.");
    } finally {
      setAddingTrackId(null);
    }
  };

  const handleRemoveTrack = async (trackId) => {
    if (!selectedPlaylist || !trackId) return;

    try {
      setRemovingTrackId(trackId);
      await removeTrackFromPlaylist(selectedPlaylist.id, trackId);
      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === selectedPlaylist.id
            ? (() => {
                const nextTracks = getPlaylistTracks(playlist).filter((track) => track.trackId !== trackId);
                return {
                  ...playlist,
                  tracks: nextTracks,
                  songs: nextTracks,
                  trackCount: nextTracks.length,
                };
              })()
            : playlist,
        ),
      );
    } catch (err) {
      console.error(err);
      setError("Failed to remove song from playlist.");
    } finally {
      setRemovingTrackId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#090909] text-white">
        Loading playlists...
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[#090909]">
      <div className="flex min-h-0 w-full flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-white/8 bg-[#121212] lg:w-[330px] lg:border-b-0 lg:border-r lg:border-r-white/8">
          <div className="border-b border-white/8 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-white">Your Library</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {libraryStats.playlistCount} playlists · {libraryStats.songCount} songs
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreatePlaylist}
                disabled={creatingPlaylist}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-50"
                aria-label="Create playlist"
              >
                <IoAdd className="text-lg" />
              </button>
            </div>

            <div className="mt-4 flex gap-2 text-sm">
              <span className="rounded-full bg-white px-3 py-1.5 font-medium text-black">Playlists</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-zinc-300">By you</span>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-full bg-white/[0.06] px-4 py-3">
              <IoSearchOutline className="text-zinc-500" />
              <input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Search in your library"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {error && !isDesktop ? (
              <div className="mx-2 mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {!playlists.length ? (
              <div className="px-2 py-2">
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-white shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
                    <IoAlbums className="text-3xl" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-white">Start your library</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Create your first playlist and your collection will start showing up here.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreatePlaylist}
                    disabled={creatingPlaylist}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
                  >
                    <IoAdd />
                    {creatingPlaylist ? "Creating..." : "Create playlist"}
                  </button>
                </div>
              </div>
            ) : filteredPlaylists.length ? (
              filteredPlaylists.map((playlist, index) => {
                const isSelected = String(playlist.id) === String(selectedPlaylistId);
                const playlistSongs = getPlaylistTracks(playlist);

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => {
                      if (isDesktop) {
                        setSelectedPlaylistId(playlist.id);
                        return;
                      }

                      navigate(`/homepage/playlists/${playlist.id}`);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      isSelected ? "bg-white/[0.12]" : "hover:bg-white/[0.06]"
                    }`}
                  >
                    <PlaylistCover playlist={playlist} index={index} className="h-14 w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                      <p className="truncate text-xs text-zinc-400">
                        Playlist · {formatTrackCount(playlistSongs.length)}
                      </p>
                    </div>
                    {!isDesktop ? (
                      <div
                        className="relative shrink-0"
                        ref={openMenuPlaylistId === playlist.id ? menuRef : null}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuPlaylistId((current) =>
                              current === playlist.id ? null : playlist.id,
                            );
                          }}
                          className="rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                          aria-label="Playlist options"
                        >
                          <IoEllipsisHorizontal className="text-lg" />
                        </button>
                        {openMenuPlaylistId === playlist.id ? (
                          <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleStartRename(playlist);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >
                              <IoPencil />
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowDeleteConfirm(playlist.id);
                                setOpenMenuPlaylistId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                            >
                              <IoTrash />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No playlists matched that search.
              </div>
            )}
          </div>
        </aside>

        {isDesktop ? (
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#121212]">
          {error ? (
            <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {!selectedPlaylist ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
              <div className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_30%),linear-gradient(180deg,#181818,#101010)] px-6 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:px-10 sm:py-12">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-900 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                  <IoAlbums className="text-5xl" />
                </div>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Your collection
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Build your first playlist
                </p>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400 sm:text-[15px]">
                  Save the songs you keep returning to, shape a mood, or start a new mix for your next jam.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleCreatePlaylist}
                    disabled={creatingPlaylist}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
                  >
                    <IoAdd />
                    {creatingPlaylist ? "Creating..." : "Create playlist"}
                  </button>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-600">
                    It only takes a second
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`relative overflow-hidden bg-gradient-to-b ${resolveGradient(selectedPlaylist, 0)} px-4 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10`}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_40%,rgba(0,0,0,0.18))]" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end">
                  <PlaylistCover
                    playlist={selectedPlaylist}
                    className="h-32 w-32 shrink-0 rounded-[8px] shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:h-[190px] sm:w-[190px]"
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/90">Playlist</p>

                    {editingPlaylistId === selectedPlaylist.id ? (
                      <div className="mt-3 flex max-w-2xl flex-wrap items-center gap-3">
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="min-w-[240px] flex-1 rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-lg font-semibold text-white outline-none"
                          placeholder="Playlist name"
                        />
                        <button
                          type="button"
                          onClick={handleSaveRename}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100"
                        >
                          <IoCheckmark />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          <IoClose />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-6xl lg:text-[5.6rem]">
                        {selectedPlaylist.name}
                      </h1>
                    )}

                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
                      {selectedPlaylist.description || "A personal collection built from your shared songs library."}
                    </p>
                    <p className="mt-3 text-sm font-medium text-white/90">
                      {authUser?.fullName || "You"} · {formatTrackCount(selectedTracks.length)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-b border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0))] px-4 py-4 sm:px-8 sm:py-5 lg:px-10">
                <button
                  type="button"
                  onClick={handlePlayPlaylist}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1ed760] text-black shadow-[0_14px_30px_rgba(30,215,96,0.3)] transition hover:scale-[1.02]"
                  aria-label="Play playlist"
                >
                  <IoPlay className="ml-1 text-[1.7rem]" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSongsModal(true)}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
                >
                  Add songs
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRename()}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
                >
                  Rename
                </button>
                <div className="relative ml-auto" ref={openMenuPlaylistId === selectedPlaylist.id ? menuRef : null}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuPlaylistId((current) =>
                        current === selectedPlaylist.id ? null : selectedPlaylist.id,
                      )
                    }
                    className="rounded-full p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Playlist options"
                  >
                    <IoEllipsisHorizontal className="text-2xl" />
                  </button>
                  {openMenuPlaylistId === selectedPlaylist.id ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur">
                      <button
                        type="button"
                        onClick={() => handleStartRename()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                      >
                        <IoPencil />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(selectedPlaylist.id);
                          setOpenMenuPlaylistId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        <IoTrash />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-8 lg:px-10">
                <div className="hidden grid-cols-[48px_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_56px] gap-4 border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 md:grid">
                  <span>#</span>
                  <span>Title</span>
                  <span className="hidden md:block">Album</span>
                  <span className="hidden lg:block">Date added</span>
                  <span className="flex justify-end">
                    <IoTimeOutline className="text-base" />
                  </span>
                </div>

                {selectedTracks.length ? (
                  <div className="divide-y divide-white/[0.04]">
                    {selectedTracks.map((track, index) => {
                      const isCurrentTrack = playback.currentTrack?.id === track.trackId;
                      const isPlaying = isCurrentTrack && playback.isPlaying;

                      return (
                        <div key={track.trackId}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePlayTrack(index)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handlePlayTrack(index);
                              }
                            }}
                            className="group hidden cursor-pointer grid-cols-[48px_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-4 rounded-xl px-4 py-3 text-sm transition hover:bg-white/[0.06] md:grid"
                          >
                            <div className="relative flex h-8 w-8 items-center justify-center text-zinc-500">
                              <span className={`tabular-nums ${isCurrentTrack ? "invisible" : "group-hover:invisible"}`}>
                                {index + 1}
                              </span>
                              <span
                                className={`absolute inset-0 flex items-center justify-center text-white ${
                                  isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}
                              >
                                {isPlaying ? <IoPause className="text-lg" /> : <IoPlay className="ml-0.5 text-lg" />}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <p className={`truncate font-medium ${isCurrentTrack ? "text-[#1ed760]" : "text-white"}`}>
                                {track.title}
                              </p>
                              <p className="truncate text-xs text-zinc-400">{track.artist}</p>
                            </div>

                            <p className="hidden truncate text-zinc-400 md:block">
                              {track.album || selectedPlaylist.name}
                            </p>

                            <p className="hidden truncate text-zinc-500 lg:block">
                              {formatAddedDate(track.addedAt)}
                            </p>

                            <div className="flex items-center justify-end gap-3">
                              <span className="text-zinc-400">{track.duration || "--"}</span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveTrack(track.trackId);
                                }}
                                disabled={removingTrackId === track.trackId}
                                className="opacity-0 text-zinc-500 transition hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
                                aria-label="Remove track from playlist"
                              >
                                <IoTrash className="text-lg" />
                              </button>
                            </div>
                          </div>

                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handlePlayTrack(index)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handlePlayTrack(index);
                              }
                            }}
                            className="cursor-pointer rounded-2xl px-4 py-3 transition hover:bg-white/[0.06] md:hidden"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white">
                                {isPlaying ? <IoPause className="text-lg" /> : <IoPlay className="ml-0.5 text-lg" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate font-medium ${isCurrentTrack ? "text-[#1ed760]" : "text-white"}`}>
                                  {track.title}
                                </p>
                                <p className="mt-1 truncate text-xs text-zinc-400">{track.artist}</p>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                  <span>{track.album || selectedPlaylist.name}</span>
                                  <span>{formatAddedDate(track.addedAt)}</span>
                                  <span>{track.duration || "--"}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveTrack(track.trackId);
                                }}
                                disabled={removingTrackId === track.trackId}
                                className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-white/10 hover:text-red-400 disabled:opacity-50"
                                aria-label="Remove track from playlist"
                              >
                                <IoTrash className="text-lg" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                    <IoMusicalNotes className="text-5xl text-zinc-700" />
                    <p className="mt-5 text-xl font-semibold text-white">This playlist is empty</p>
                    <p className="mt-2 max-w-md text-sm leading-7 text-zinc-400">
                      Add songs from your library and this page will start feeling a lot more alive.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddSongsModal(true)}
                      className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100"
                    >
                      Add songs
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          </section>
        ) : null}
      </div>

      {isDesktop && showAddSongsModal && selectedPlaylist ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_24px_90px_rgba(0,0,0,0.52)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Add songs</p>
                <p className="text-xs text-zinc-500">{selectedPlaylist.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddSongsModal(false);
                  setTrackSearch("");
                }}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close add songs dialog"
              >
                <IoClose className="text-lg" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="flex items-center gap-3 rounded-full bg-white/[0.06] px-4 py-3">
                <IoSearchOutline className="text-zinc-500" />
                <input
                  value={trackSearch}
                  onChange={(event) => setTrackSearch(event.target.value)}
                  placeholder="Search your available songs"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                />
              </label>

              <div className="max-h-[420px] space-y-2 overflow-y-auto">
                {trackOptions.length ? (
                  trackOptions.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleAddTrack(track)}
                      disabled={addingTrackId === track.id}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06] disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{track.title}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {track.artist}
                          {track.album ? ` · ${track.album}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-200">
                        {addingTrackId === track.id ? "Adding..." : "Add"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-14 text-center text-sm text-zinc-500">
                    No more songs available to add.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isDesktop && editingPlaylistId ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full rounded-[28px] border border-white/10 bg-[#101010] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">Rename playlist</p>
                <p className="mt-1 text-sm text-zinc-500">Give your playlist a cleaner title.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelRename}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close rename dialog"
              >
                <IoClose className="text-lg" />
              </button>
            </div>
            <input
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-base font-medium text-white outline-none placeholder:text-zinc-500"
              placeholder="Playlist name"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCancelRename}
                className="flex-1 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#101010] p-6 shadow-2xl">
            <p className="text-lg font-semibold text-white">Delete this playlist?</p>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              This removes the playlist and its track order from your library.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlaylist}
                className="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PlaylistsPage;
