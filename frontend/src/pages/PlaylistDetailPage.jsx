import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  IoArrowBack,
  IoHeart,
  IoMusicalNotes,
  IoPause,
  IoPlay,
  IoTimeOutline,
  IoTrash,
} from "react-icons/io5";
import { deletePlaylist, fetchPlaylist, removeTrackFromPlaylist } from "../api/playlistsApi.js";
import { usePlaybackActions } from "../components/playback/usePlaybackActions.js";

const coverGradients = [
  "from-violet-700 via-indigo-600 to-slate-950",
  "from-emerald-500 via-emerald-700 to-zinc-950",
  "from-fuchsia-600 via-purple-700 to-zinc-950",
  "from-sky-500 via-blue-700 to-zinc-950",
  "from-amber-500 via-orange-700 to-zinc-950",
];

const resolveGradient = (playlist) => playlist?.gradient || coverGradients[0];

const formatAddedDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const PlaylistCover = ({ playlist }) => {
  const isLikedStyle = /liked/i.test(playlist?.name || "");

  return (
    <div
      className={`relative h-32 w-32 shrink-0 overflow-hidden rounded-[8px] bg-gradient-to-br sm:h-[190px] sm:w-[190px] ${resolveGradient(
        playlist,
      )} shadow-[0_24px_60px_rgba(0,0,0,0.45)]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
      <div className="relative flex h-full w-full items-center justify-center text-white">
        {isLikedStyle ? <IoHeart className="text-[38%]" /> : <IoMusicalNotes className="text-[38%]" />}
      </div>
    </div>
  );
};

const PlaylistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const authUser = useSelector((store) => store.user.authUser);
  const playback = useSelector((store) => store.playback);
  const { emitPlaySelection, emitPlay, emitPause } = usePlaybackActions();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingTrackId, setRemovingTrackId] = useState(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);

  const loadPlaylist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPlaylist(id);
      setPlaylist(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load playlist.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPlaylist();
  }, [loadPlaylist]);

  const tracks = useMemo(() => playlist?.tracks || [], [playlist]);

  const handlePlayPlaylist = () => {
    if (!tracks.length) {
      setError("This playlist is empty. Add songs before playing.");
      return;
    }
    emitPlaySelection(tracks, 0);
  };

  const handlePlayTrack = (trackIndex) => {
    const track = tracks[trackIndex];
    if (!track) return;

    if (playback.currentTrack?.id === track.trackId) {
      playback.isPlaying ? emitPause() : emitPlay();
      return;
    }

    emitPlaySelection(tracks, trackIndex);
  };

  const handleRemoveTrack = async (trackId) => {
    if (!playlist) return;

    try {
      setRemovingTrackId(trackId);
      await removeTrackFromPlaylist(id, trackId);
      setPlaylist((current) => ({
        ...current,
        tracks: (current?.tracks || []).filter((track) => track.trackId !== trackId),
        songs: (current?.tracks || []).filter((track) => track.trackId !== trackId),
        trackCount: Math.max(0, (current?.trackCount || 0) - 1),
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to remove song from playlist.");
    } finally {
      setRemovingTrackId(null);
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      setDeletingPlaylist(true);
      await deletePlaylist(id);
      navigate("/homepage/playlists");
    } catch (err) {
      console.error(err);
      setError("Failed to delete playlist.");
    } finally {
      setDeletingPlaylist(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#121212] text-white">
        Loading playlist...
      </div>
    );
  }

  if (error && !playlist) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#121212] px-6 text-center text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#121212] lg:overflow-hidden">
      {error ? (
        <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className={`relative overflow-visible bg-gradient-to-b ${resolveGradient(playlist)} px-4 pb-6 pt-6 sm:overflow-hidden sm:px-8 sm:pb-8 sm:pt-8 lg:px-10`}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_40%,rgba(0,0,0,0.18))]" />
        <div className="relative">
          <button
            type="button"
            onClick={() => navigate("/homepage/playlists")}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
          >
            <IoArrowBack />
            Back to library
          </button>

          <div className="flex flex-col items-center gap-5 text-center sm:items-start sm:text-left lg:flex-row lg:items-end">
            <PlaylistCover playlist={playlist} />
            <div className="min-w-0 w-full">
              <p className="text-sm font-medium text-white/90">Playlist</p>
              <h1 className="mt-2 break-words text-[2.35rem] font-black leading-[0.92] tracking-tight text-white sm:text-6xl sm:leading-[0.92] lg:text-[5.6rem]">
                {playlist?.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
                {playlist?.description || "A personal collection built from your shared songs library."}
              </p>
              <p className="mt-3 text-sm font-medium text-white/90">
                {authUser?.fullName || "You"} · {playlist?.trackCount || 0} songs
              </p>
            </div>
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
          onClick={handleDeletePlaylist}
          disabled={deletingPlaylist}
          className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500/12 disabled:opacity-50"
        >
          {deletingPlaylist ? "Deleting..." : "Delete playlist"}
        </button>
      </div>

      <div className="min-h-0 flex-none overflow-visible px-4 pb-8 sm:px-8 lg:flex-1 lg:overflow-y-auto lg:px-10">
        <div className="hidden grid-cols-[48px_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_56px] gap-4 border-b border-white/8 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 md:grid">
          <span>#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="hidden lg:block">Date added</span>
          <span className="flex justify-end">
            <IoTimeOutline className="text-base" />
          </span>
        </div>

        {tracks.length ? (
          <div className="divide-y divide-white/[0.04]">
            {tracks.map((track, index) => {
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
                      {track.album || playlist?.name}
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
                          <span>{track.album || playlist?.name}</span>
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
              Add songs from your library to fill this playlist out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetailPage;
