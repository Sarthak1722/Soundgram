import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { effectivePlaybackTime } from "../utils/playbackTime.js";
import { resolveAppUrl } from "../config/runtime.js";
import { getTrackDurationSeconds } from "../utils/trackDuration.js";

export function fullAudioUrl(urlPath) {
  return resolveAppUrl(urlPath);
}

/**
 * Drives <audio> from Redux playback mirror (updated only via socket playbackUpdate).
 */
export function usePlaybackAudioSync(audioRef) {
  const playback = useSelector((s) => s.playback);
  const playbackRef = useRef(playback);
  const lastSyncStampRef = useRef(null);
  playbackRef.current = playback;

  const currentTrack = playback.currentTrack;
  const isPlaying = playback.isPlaying;
  const positionSeconds = playback.positionSeconds;
  const playheadEpochMs = playback.playheadEpochMs;
  const serverNow = playback.serverNow;
  const trackDurationSeconds = getTrackDurationSeconds(currentTrack);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!currentTrack?.url) {
      el.pause();
      el.removeAttribute("src");
      el.removeAttribute("data-playback-src");
      return;
    }

    const nextSrc = fullAudioUrl(currentTrack.url);
    const prevMarked = el.getAttribute("data-playback-src");
    if (prevMarked !== nextSrc) {
      el.setAttribute("data-playback-src", nextSrc);
      el.src = nextSrc;
      el.load();
    }

    const syncElement = () => {
      const t = effectivePlaybackTime(playbackRef.current);
      const clampedTime =
        Number.isFinite(trackDurationSeconds) && trackDurationSeconds > 0
          ? Math.min(t, trackDurationSeconds)
          : t;
      const syncStamp = `${playbackRef.current.serverNow ?? "local"}:${playbackRef.current.positionSeconds}:${playbackRef.current.isPlaying ? 1 : 0}`;

      if (
        Number.isFinite(clampedTime) &&
        clampedTime >= 0 &&
        (lastSyncStampRef.current !== syncStamp || Math.abs(el.currentTime - clampedTime) > 0.1)
      ) {
        el.currentTime = clampedTime;
        lastSyncStampRef.current = syncStamp;
      }
      if (playbackRef.current.isPlaying) {
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    };

    if (el.readyState >= 1) {
      syncElement();
    } else {
      const onMeta = () => {
        syncElement();
        el.removeEventListener("loadedmetadata", onMeta);
      };
      el.addEventListener("loadedmetadata", onMeta);
      return () => el.removeEventListener("loadedmetadata", onMeta);
    }
  }, [
    audioRef,
    currentTrack?.url,
    currentTrack?.id,
    isPlaying,
    positionSeconds,
    playheadEpochMs,
    serverNow,
    trackDurationSeconds,
  ]);
}
