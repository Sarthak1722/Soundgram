import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IoHeart, IoTimeOutline, IoPlay, IoPause, IoTrash, IoArrowBack } from "react-icons/io5";
import { fetchPlaylist, removeTrackFromPlaylist, deletePlaylist } from "../api/playlistsApi.js";
import { useSelector } from "react-redux";
import { usePlaybackActions } from "../components/playback/PlaybackActionsProvider.jsx";

const PlaylistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingTrack, setRemovingTrack] = useState(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);

  const playback = useSelector((s) => s.playback);
  const { emitPlaySelection, emitPlay, emitPause } = usePlaybackActions();

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await fetchPlaylist(id);
      setPlaylist(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load playlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrack = async (trackId) => {
    if (!playlist) return;

    try {
      setRemovingTrack(trackId);
      await removeTrackFromPlaylist(id, trackId);
      setPlaylist(prev => ({
        ...prev,
        tracks: prev.tracks.filter(t => t.trackId !== trackId),
        trackCount: prev.trackCount - 1,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to remove track");
    } finally {
      setRemovingTrack(null);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      setDeletingPlaylist(true);
      await deletePlaylist(id);
      navigate("/homepage/playlists");
    } catch (err) {
      console.error(err);
      setError("Failed to delete playlist");
    } finally {
      setDeletingPlaylist(false);
    }
  };

  const handlePlayTrack = (track, trackIndex) => {
    if (playback.currentTrack?.id === track.trackId) {
      playback.isPlaying ? emitPause() : emitPlay();
    } else {
      emitPlaySelection(playlist?.tracks || [], trackIndex);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading playlist...</div>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400">{error || "Playlist not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-emerald-900/20 to-transparent px-8 py-8">
        <div className="mx-auto flex max-w-5xl items-end gap-6">
          <button
            onClick={() => navigate("/homepage/playlists")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Back to playlists"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <div className={`h-40 w-40 shrink-0 rounded-lg bg-gradient-to-br ${playlist.gradient} shadow-2xl shadow-emerald-950/50`} />
          <div className="min-w-0 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Playlist
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white md:text-5xl">
              {playlist.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {playlist.description || "No description"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {playlist.trackCount} songs
            </p>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleDeletePlaylist}
              disabled={deletingPlaylist}
              className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <IoTrash className="text-lg" />
              {deletingPlaylist ? "Deleting..." : "Delete Playlist"}
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex gap-3 border-b border-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="w-8 shrink-0 text-center">#</span>
            <span className="min-w-0 flex-1">Title</span>
            <span className="hidden min-w-0 flex-1 sm:block">Artist</span>
            <span className="flex w-14 shrink-0 items-center justify-end">
              <IoTimeOutline className="text-base" />
            </span>
            <span className="w-12 shrink-0"></span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {playlist.tracks.map((track, i) => {
              const isCurrentTrack = playback.currentTrack?.id === track.trackId;
              const isPlaying = isCurrentTrack && playback.isPlaying;

              return (
                <li
                  key={track.trackId}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/[0.06]"
                >
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500">
                    <span className="tabular-nums group-hover:invisible">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => handlePlayTrack(track, i)}
                      className={`absolute inset-0 flex items-center justify-center text-emerald-400 transition ${
                        isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <IoPause className="text-lg" /> : <IoPlay className="text-lg pl-0.5" />}
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0">
                      <p className={`truncate font-medium ${isCurrentTrack ? "text-emerald-400" : "text-white"}`}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{track.artist}</p>
                    </div>
                  </div>
                  <p className="hidden min-w-0 flex-1 truncate text-zinc-400 sm:block">{track.artist}</p>
                  <p className="w-14 shrink-0 text-right tabular-nums text-zinc-500">
                    {track.duration || "—"}
                  </p>
                  <button
                    onClick={() => handleRemoveTrack(track.trackId)}
                    disabled={removingTrack === track.trackId}
                    className="w-8 shrink-0 text-zinc-500 hover:text-red-400 transition"
                    aria-label="Remove from playlist"
                  >
                    <IoTrash className="text-lg" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetailPage;
