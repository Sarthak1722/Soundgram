import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  IoPlay,
  IoPause,
  IoPlaySkipBack,
  IoPlaySkipForward,
} from "react-icons/io5";
import { usePlaybackActions } from "./usePlaybackActions.js";
import { usePlaybackAudioSync } from "../../hooks/usePlaybackAudioSync.js";
import { usePlaybackTimeline } from "../../hooks/usePlaybackTimeline.js";
import { fetchPlaybackTracks } from "../../api/playbackApi.js";
import { setPlaybackQueueIndex } from "../../redux/playbackSlice.js";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function jamSubtitle(activeJam, playbackRoomId) {
  if (!activeJam) {
    return "Solo playback";
  }
  if (activeJam.kind === "dm") {
    return `DM jam · ${activeJam.label} · ${playbackRoomId || "pair room"}`;
  }
  return `Group jam · ${activeJam.label} · ${playbackRoomId || activeJam.roomId}`;
}

const GlobalPlaybackBar = ({ mobile = false }) => {
  const audioRef = useRef(null);
  const dispatch = useDispatch();
  const playback = useSelector((s) => s.playback);
  const queue = useMemo(() => playback.queue || [], [playback.queue]);
  const queueIndex = Number.isFinite(playback.queueIndex) ? playback.queueIndex : -1;
  const activeJam = useSelector((s) => s.rooms.activeJam);
  const authUser = useSelector((s) => s.user.authUser);

  const {
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeTrack,
    emitPlaySelection,
    emitNextTrack,
    emitPrevTrack,
    hasActiveJam,
  } = usePlaybackActions();

  usePlaybackAudioSync(audioRef);

  const [duration, setDuration] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [, setUiTick] = useState(0);

  useEffect(() => {
    if (!authUser?._id) return;
    fetchPlaybackTracks()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, [authUser?._id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onDur = () => {
      const nextDuration = Number(el.duration);
      setDuration(Number.isFinite(nextDuration) && nextDuration > 0 ? nextDuration : 0);
    };

    onDur();
    el.addEventListener("loadedmetadata", onDur);
    el.addEventListener("durationchange", onDur);
    return () => {
      el.removeEventListener("loadedmetadata", onDur);
      el.removeEventListener("durationchange", onDur);
    };
  }, [playback.currentTrack?.id]);

  useEffect(() => {
    if (!playback.isPlaying) return;
    const id = setInterval(() => setUiTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [playback.isPlaying]);

  const {
    displayTime,
    durationSeconds: resolvedDuration,
    maxDuration: maxDur,
    beginSeeking,
    updateSeeking,
    commitSeeking,
  } = usePlaybackTimeline(playback, duration, emitSeek);

  const handlePrevTrack = () => {
    if (hasActiveJam) {
      emitPrevTrack();
      return;
    }
    if (queue.length > 0 && playback.currentTrack) {
      const currentIndex =
        queueIndex >= 0 ? queueIndex : queue.findIndex((t) => t.id === playback.currentTrack?.id);
      const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
      const prevTrack = queue[prevIndex];
      if (prevTrack) {
        dispatch(setPlaybackQueueIndex(prevIndex));
        emitChangeTrack(prevTrack.id, prevTrack);
      }
      return;
    }
    if (!catalog.length || !playback.currentTrack) return;
    const currentIndex = catalog.findIndex((t) => t.id === playback.currentTrack?.id);
    if (currentIndex > 0) {
      const prev = catalog[currentIndex - 1];
      emitChangeTrack(prev.id, prev);
    }
  };

  const handleNextTrack = useCallback(() => {
    if (hasActiveJam) {
      emitNextTrack();
      return;
    }
    if (queue.length > 0 && playback.currentTrack) {
      const currentIndex =
        queueIndex >= 0 ? queueIndex : queue.findIndex((t) => t.id === playback.currentTrack?.id);
      const nextIndex = (currentIndex + 1) % queue.length;
      const nextTrack = queue[nextIndex];
      if (nextTrack) {
        dispatch(setPlaybackQueueIndex(nextIndex));
        emitChangeTrack(nextTrack.id, nextTrack);
      }
      return;
    }
    if (!catalog.length || !playback.currentTrack) return;
    const currentIndex = catalog.findIndex((t) => t.id === playback.currentTrack?.id);
    if (currentIndex >= 0) {
      const next = catalog[(currentIndex + 1) % catalog.length];
      emitChangeTrack(next.id, next);
    }
  }, [hasActiveJam, emitNextTrack, queue, queueIndex, playback.currentTrack, catalog, dispatch, emitChangeTrack]);

  const handleTrackEnd = useCallback(() => {
    handleNextTrack();
  }, [handleNextTrack]);

  if (!authUser?._id) return null;

  if (mobile) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,21,22,0.98),rgba(15,15,16,0.96))] px-3.5 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <audio ref={audioRef} preload="auto" className="hidden" onEnded={handleTrackEnd} />

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-emerald-500 to-emerald-800 text-sm font-bold text-white shadow-lg shadow-emerald-950/50">
            ♪
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">
              {playback.currentTrack?.title || "Pick a track"}
            </p>
            <p className="truncate text-[11px] text-zinc-400">
              {playback.currentTrack?.artist || "Your global player stays with every screen"}
            </p>
            <p className="truncate pt-0.5 text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              {activeJam ? jamSubtitle(activeJam, playback.roomId) : "Solo playback"}
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrevTrack}
              className="rounded-full p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Previous track"
            >
              <IoPlaySkipBack className="text-[15px]" />
            </button>
            <button
              type="button"
              disabled={!playback.currentTrack}
              onClick={() => (playback.isPlaying ? emitPause() : emitPlay())}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 disabled:opacity-30"
              aria-label={playback.isPlaying ? "Pause" : "Play"}
            >
              {playback.isPlaying ? (
                <IoPause className="text-base" />
              ) : (
                <IoPlay className="pl-0.5 text-base" />
              )}
            </button>
            <button
              type="button"
              onClick={handleNextTrack}
              className="rounded-full p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Next track"
            >
              <IoPlaySkipForward className="text-[15px]" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500 tabular-nums">
          <span>{formatTime(displayTime)}</span>
          <input
            type="range"
            min={0}
            max={maxDur}
            step={0.25}
            disabled={!playback.currentTrack}
            value={Math.min(displayTime, maxDur)}
            onPointerDown={beginSeeking}
            onFocus={beginSeeking}
            onChange={(e) => updateSeeking(e.target.value)}
            onPointerUp={(e) => commitSeeking(e.target.value)}
            onKeyUp={(e) => commitSeeking(e.target.value)}
            onBlur={(e) => commitSeeking(e.target.value)}
            className="h-1 flex-1 accent-emerald-500 disabled:opacity-30"
          />
          <span>{formatTime(resolvedDuration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-[#121212]/98 px-4 py-3 backdrop-blur-xl">
      <audio ref={audioRef} preload="auto" className="hidden" onEnded={handleTrackEnd} />

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
              onClick={handlePrevTrack}
              className="rounded-full p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Previous track"
            >
              <IoPlaySkipBack className="text-xl" />
            </button>
            <button
              type="button"
              disabled={!playback.currentTrack}
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
              onClick={handleNextTrack}
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
              disabled={!playback.currentTrack}
              value={Math.min(displayTime, maxDur)}
              onPointerDown={beginSeeking}
              onFocus={beginSeeking}
              onChange={(e) => updateSeeking(e.target.value)}
              onPointerUp={(e) => commitSeeking(e.target.value)}
              onKeyUp={(e) => commitSeeking(e.target.value)}
              onBlur={(e) => commitSeeking(e.target.value)}
              className="h-1 flex-1 accent-emerald-500 disabled:opacity-30"
            />
            <span>{formatTime(resolvedDuration)}</span>
          </div>
        </div>

        <div className="flex min-w-[140px] items-center justify-end">
          <select
            disabled={catalog.length === 0}
            value={playback.currentTrack?.id || ""}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              const trackIndex = catalog.findIndex((t) => t.id === id);
              if (trackIndex < 0) return;
              emitPlaySelection(catalog, trackIndex);
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
