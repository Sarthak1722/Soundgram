import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { effectivePlaybackTime } from "../utils/playbackTime.js";

const API_URL = import.meta.env.VITE_API_URL;

export function fullAudioUrl(urlPath) {
  if (!urlPath) return "";
  if (urlPath.startsWith("http")) return urlPath;
  const base = API_URL.replace(/\/$/, "");
  const p = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  return `${base}${p}`;
}

/**
 * Drives <audio> from Redux playback mirror (updated only via socket playbackUpdate).
 */
export function usePlaybackAudioSync(audioRef) {
  const playback = useSelector((s) => s.playback);
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  const currentTrack = playback.currentTrack;
  const isPlaying = playback.isPlaying;
  const positionSeconds = playback.positionSeconds;
  const playheadEpochMs = playback.playheadEpochMs;
  const serverNow = playback.serverNow;

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
      if (Number.isFinite(t) && t >= 0 && Math.abs(el.currentTime - t) > 0.85) {
        el.currentTime = t;
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
  ]);
}
