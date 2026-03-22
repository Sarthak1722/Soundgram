import React, { useRef, useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  IoPlay,
  IoPause,
  IoPlaySkipBack,
  IoPlaySkipForward,
} from "react-icons/io5";
import { usePlaybackActions } from "./PlaybackActionsProvider.jsx";
import { usePlaybackAudioSync } from "../../hooks/usePlaybackAudioSync.js";
import { effectivePlaybackTime } from "../../utils/playbackTime.js";
import { fetchPlaybackTracks } from "../../api/playbackApi.js";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function jamSubtitle(activeJam, playbackRoomId) {
  if (!activeJam) {
    return "Open Messages (DM) or Jam rooms to pick a sync target";
  }
  if (activeJam.kind === "dm") {
    return `DM jam · ${activeJam.label} · ${playbackRoomId || "pair room"}`;
  }
  return `Group jam · ${activeJam.label} · ${playbackRoomId || activeJam.roomId}`;
}

const GlobalPlaybackBar = () => {
  const audioRef = useRef(null);
  const playback = useSelector((s) => s.playback);
  const activeJam = useSelector((s) => s.rooms.activeJam);
  const authUser = useSelector((s) => s.user.authUser);

  const {
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeTrack,
    emitNextTrack,
    emitPrevTrack,
    hasActiveJam,
  } = usePlaybackActions();

  usePlaybackAudioSync(audioRef);

  const [duration, setDuration] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [, setUiTick] = useState(0);
  const [seekPreview, setSeekPreview] = useState(null);

  useEffect(() => {
    if (!authUser?._id) return;
    fetchPlaybackTracks()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, [authUser?._id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onDur = () => setDuration(el.duration || 0);
    el.addEventListener("loadedmetadata", onDur);
    return () => el.removeEventListener("loadedmetadata", onDur);
  }, [playback.currentTrack?.id]);

  useEffect(() => {
    if (!playback.isPlaying) return;
    const id = setInterval(() => setUiTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [playback.isPlaying]);

  const displayTime =
    seekPreview != null ? seekPreview : effectivePlaybackTime(playback);
  const maxDur = Number.isFinite(duration) && duration > 0 ? duration : 1;

  const onSeekPointerUp = useCallback(() => {
    if (seekPreview == null) return;
    emitSeek(seekPreview);
    setSeekPreview(null);
  }, [seekPreview, emitSeek]);

  const onSeekInput = useCallback((e) => {
    setSeekPreview(Number(e.target.value));
  }, []);

  if (!authUser?._id) return null;

  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-[#121212]/98 px-4 py-3 backdrop-blur-xl">
      <audio ref={audioRef} preload="auto" className="hidden" />

      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-green-900 text-lg font-bold text-white shadow-lg">
            ♪
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {playback.currentTrack?.title || "No track"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {playback.currentTrack?.artist || "—"}
            </p>
            <p className="truncate text-[10px] text-zinc-600">
              {jamSubtitle(activeJam, playback.roomId)}
            </p>
          </div>
        </div>

        <div className="flex flex-[2] flex-col gap-1">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={!hasActiveJam}
              onClick={() => emitPrevTrack()}
              className="rounded-full p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Previous track"
            >
              <IoPlaySkipBack className="text-xl" />
            </button>
            <button
              type="button"
              disabled={!hasActiveJam}
              onClick={() => (playback.isPlaying ? emitPause() : emitPlay())}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:opacity-30"
              aria-label={playback.isPlaying ? "Pause" : "Play"}
            >
              {playback.isPlaying ? (
                <IoPause className="text-xl" />
              ) : (
                <IoPlay className="text-xl pl-0.5" />
              )}
            </button>
            <button
              type="button"
              disabled={!hasActiveJam}
              onClick={() => emitNextTrack()}
              className="rounded-full p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Next track"
            >
              <IoPlaySkipForward className="text-xl" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 tabular-nums">
            <span>{formatTime(displayTime)}</span>
            <input
              type="range"
              min={0}
              max={maxDur}
              step={0.25}
              disabled={!hasActiveJam || !playback.currentTrack}
              value={Math.min(displayTime, maxDur)}
              onChange={onSeekInput}
              onMouseUp={onSeekPointerUp}
              onTouchEnd={onSeekPointerUp}
              className="h-1 flex-1 accent-emerald-500 disabled:opacity-30"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex min-w-[140px] items-center justify-end">
          <select
            disabled={!hasActiveJam || catalog.length === 0}
            value={playback.currentTrack?.id || ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) emitChangeTrack(id);
            }}
            className="max-w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white disabled:opacity-30"
          >
            <option value="">Pick a track…</option>
            {catalog.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {t.artist}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlaybackBar;
