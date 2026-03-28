import { useEffect, useState, useRef } from "react";
import { IoAdd, IoMusicalNotes, IoTrash, IoPlay, IoEllipsisVertical, IoChevronUp, IoChevronDown } from "react-icons/io5";
import {
  fetchUserPlaylists,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  updatePlaylist,
} from "../api/playlistsApi.js";
import { fetchPlaybackTracks } from "../api/playbackApi.js";
import { usePlaybackActions } from "../components/playback/PlaybackActionsProvider.jsx";

function PlaylistsPage() {
  const { emitPlaySelection } = usePlaybackActions();
  const [playlists, setPlaylists] = useState([]);
  const [availableTracks, setAvailableTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState({});
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [openMenuPlaylistId, setOpenMenuPlaylistId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const editInputRef = useRef(null);
  const openMenuRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!openMenuPlaylistId) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (openMenuRef.current && !openMenuRef.current.contains(event.target)) {
        setOpenMenuPlaylistId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuPlaylistId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playlistsData, tracksData] = await Promise.all([
        fetchUserPlaylists(),
        fetchPlaybackTracks(),
      ]);
      setPlaylists(playlistsData);
      setAvailableTracks(tracksData);
    } catch (err) {
      console.error(err);
      setError("Failed to load playlists and tracks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    try {
      setCreatingPlaylist(true);
      const newPlaylist = await createPlaylist({
        name: `New playlist ${playlists.length + 1}`,
        description: "Created from your library",
      });
      if (newPlaylist) {
        setPlaylists(prev => [newPlaylist, ...prev]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create playlist");
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      setDeletingPlaylistId(playlistId);
      const success = await deletePlaylist(playlistId);
      if (success) {
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete playlist");
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const handleStartRename = (playlistId, currentName) => {
    setEditingPlaylistId(playlistId);
    setEditingName(currentName);
    setOpenMenuPlaylistId(null);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const handleCancelRename = () => {
    setEditingPlaylistId(null);
    setEditingName("");
  };

  const toggleExpand = (playlistId) => {
    setExpandedPlaylistId((prev) => (prev === playlistId ? null : playlistId));
    setOpenMenuPlaylistId(null);
  };

  const toggleMenu = (playlistId, e) => {
    e.stopPropagation();
    setOpenMenuPlaylistId((prev) => (prev === playlistId ? null : playlistId));
  };

  const getPlaylistSongs = (playlist) => {
    if (Array.isArray(playlist?.songs)) {
      return playlist.songs;
    }
    if (Array.isArray(playlist?.tracks)) {
      return playlist.tracks;
    }
    return [];
  };

  const handleSaveRename = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("Playlist name cannot be empty.");
      return;
    }

    setSavingName(true);
    try {
      const updated = await updatePlaylist(editingPlaylistId, { name: trimmed });
      if (updated) {
        setPlaylists((prev) =>
          prev.map((p) => (p.id === editingPlaylistId ? { ...p, name: updated.name } : p))
        );
        setEditingPlaylistId(null);
        setEditingName("");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to rename playlist");
    } finally {
      setSavingName(false);
    }
  };

  const handlePlayPlaylist = (playlist) => {
    const playlistSongs = getPlaylistSongs(playlist);

    if (import.meta.env.DEV) {
      console.log("Playlist:", playlist);
      console.log("Songs:", playlistSongs);
    }

    if (!playlistSongs || playlistSongs.length === 0) {
      setError("This playlist is empty. Add tracks before playing.");
      return;
    }

    emitPlaySelection(playlistSongs, 0);
  };

  const handlePlayTrack = (playlist, trackIndex) => {
    const playlistSongs = getPlaylistSongs(playlist);

    if (!playlistSongs.length) {
      return;
    }

    emitPlaySelection(playlistSongs, trackIndex);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const handleDeleteClick = (playlistId) => {
    setOpenMenuPlaylistId(null);
    setShowDeleteConfirm(playlistId);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      setDeletingPlaylistId(showDeleteConfirm);
      const success = await deletePlaylist(showDeleteConfirm);
      if (success) {
        setPlaylists(prev => prev.filter(p => p.id !== showDeleteConfirm));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete playlist");
    } finally {
      setDeletingPlaylistId(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleSelect = (playlistId, value) => {
    setSelectedTracks((prev) => ({ ...prev, [playlistId]: value }));
  };

  const handleAdd = async (playlistId) => {
    const trackId = selectedTracks[playlistId];
    if (!trackId) return;

    const track = availableTracks.find(t => t.id === trackId);
    if (!track) return;

    try {
      const updatedPlaylist = await addTrackToPlaylist(playlistId, {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        url: track.url,
        duration: track.duration,
        durationSeconds: track.durationSeconds,
      });

      if (updatedPlaylist) {
        setPlaylists(prev =>
          prev.map(p =>
            p.id === playlistId
              ? updatedPlaylist
              : p
          )
        );
        setSelectedTracks(prev => ({ ...prev, [playlistId]: "" }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add track to playlist");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading playlists...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="border-b border-white/[0.06] px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Your library</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Create and manage your playlists. Click on any playlist to view and play tracks.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreatePlaylist}
            disabled={creatingPlaylist}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-zinc-100 disabled:opacity-50"
          >
            <IoAdd className="text-lg" />
            {creatingPlaylist ? "Creating..." : "New playlist"}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {error && (
          <p className="mb-4 rounded-lg border border-red-500 bg-red-900/40 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {playlists.length === 0 ? (
          <div className="text-center py-12">
            <IoMusicalNotes className="mx-auto text-6xl text-zinc-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No playlists yet</h3>
            <p className="text-zinc-400 mb-6">Create your first playlist to get started</p>
            <button
              onClick={handleCreatePlaylist}
              disabled={creatingPlaylist}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-zinc-100 disabled:opacity-50"
            >
              <IoAdd className="text-lg" />
              Create playlist
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => {
              const playlistId = p?._id ?? p?.id;

              if (!playlistId) {
                return null;
              }

              const selected = selectedTracks[playlistId] || "";
              const playlistSongs = getPlaylistSongs(p);
              const playlistTrackIds = new Set((p.trackIds || playlistSongs.map((track) => track.trackId)).filter(Boolean));
              const trackOptions = availableTracks.filter((t) => !playlistTrackIds.has(t.id));

              const isExpanded = expandedPlaylistId === playlistId;
              const isMenuOpen = openMenuPlaylistId === playlistId;

              return (
                <div
                  key={playlistId}
                  className={`group relative rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-lg transition hover:border-white/20 hover:shadow-2xl ${p.gradient}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      {editingPlaylistId === playlistId ? (
                        <input
                          ref={editInputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleSaveRename}
                          onKeyDown={handleKeyDown}
                          className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-sm text-white"
                          placeholder="Playlist name"
                        />
                      ) : (
                        <h2
                          className="truncate text-lg font-bold text-white cursor-pointer hover:text-emerald-300"
                          onClick={() => handleStartRename(playlistId, p.name)}
                          title="Click to rename"
                        >
                          {p.name}
                        </h2>
                      )}
                      <p className="text-xs text-zinc-400 line-clamp-1">{p.description || "No description"}</p>
                      <p className="text-xs text-zinc-400">{(p.trackCount || 0)} song{(p.trackCount || 0) === 1 ? "" : "s"}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlayPlaylist(p)}
                        className="rounded-full bg-emerald-500 p-2 text-white transition hover:bg-emerald-400 hover:scale-105"
                        title="Play playlist"
                      >
                        <IoPlay className="text-lg" />
                      </button>

                      <div
                        ref={isMenuOpen ? openMenuRef : null}
                        className="relative"
                      >
                        <button
                          type="button"
                          onClick={(e) => toggleMenu(playlistId, e)}
                          className="rounded-full p-2 text-zinc-400 transition hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100"
                          title="Playlist options"
                        >
                          <IoEllipsisVertical className="text-lg" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur">
                            <button
                              type="button"
                              onClick={() => handleStartRename(playlistId, p.name)}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >
                              Rename playlist
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(playlistId)}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                            >
                              Delete playlist
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(playlistId)}
                        className="rounded-full p-2 text-zinc-400 transition hover:text-white hover:bg-white/10"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <IoChevronUp className="text-lg" /> : <IoChevronDown className="text-lg" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4">

                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        {playlistSongs.length > 0 ? (
                          <div className="space-y-1">
                            {playlistSongs.map((t, idx) => (
                                <div
                                  key={t.trackId || t.id}
                                  className="group/track flex items-center gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-white/10 cursor-pointer"
                                  onClick={() => handlePlayTrack(p, idx)}
                                >
                                  <span className="w-6 text-center text-xs text-zinc-500 tabular-nums">{idx + 1}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-white">{t.title}</p>
                                    <p className="truncate text-xs text-zinc-400">{t.artist}</p>
                                  </div>
                                  <button
                                    type="button"
                                    className="opacity-0 group-hover/track:opacity-100 rounded-full p-1 text-emerald-400 transition hover:bg-emerald-500/20"
                                    title="Play track"
                                  >
                                    <IoPlay className="text-sm" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-400">No songs in this playlist yet. Add from your library below.</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <select
                          className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-sm text-white"
                          value={selected}
                          onChange={(e) => handleSelect(playlistId, e.target.value)}
                        >
                          <option value="">Add a track</option>
                          {trackOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} — {t.artist}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!selected}
                            onClick={() => handleAdd(playlistId)}
                            className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-40"
                          >
                            Add track
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-zinc-900 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-2">Delete playlist?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                This action cannot be undone. The playlist will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deletingPlaylistId === showDeleteConfirm}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingPlaylistId === showDeleteConfirm ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaylistsPage;
