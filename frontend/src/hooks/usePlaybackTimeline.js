import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { effectivePlaybackTime } from "../utils/playbackTime.js";
import { getTrackDurationSeconds } from "../utils/trackDuration.js";

function clampTime(value, maxDuration) {
  const normalized = Math.max(0, Number(value) || 0);
  if (Number.isFinite(maxDuration) && maxDuration > 0) {
    return Math.min(normalized, maxDuration);
  }
  return normalized;
}

export function usePlaybackTimeline(playback, audioDuration, onSeekCommit) {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(null);
  const pendingSeekRef = useRef(null);

  const trackDurationSeconds = getTrackDurationSeconds(playback?.currentTrack);
  const durationSeconds = useMemo(() => {
    if (Number.isFinite(trackDurationSeconds) && trackDurationSeconds > 0) {
      return trackDurationSeconds;
    }
    if (Number.isFinite(audioDuration) && audioDuration > 0) {
      return audioDuration;
    }
    return 0;
  }, [trackDurationSeconds, audioDuration]);

  const liveTime = effectivePlaybackTime(playback);
  const displayTime = isSeeking && seekValue != null
    ? clampTime(seekValue, durationSeconds)
    : clampTime(liveTime, durationSeconds);
  const maxDuration = durationSeconds > 0 ? durationSeconds : 1;

  useEffect(() => {
    if (isSeeking) return;
    setSeekValue(null);
    pendingSeekRef.current = null;
  }, [
    isSeeking,
    playback?.currentTrack?.id,
    playback?.positionSeconds,
    playback?.playheadEpochMs,
    playback?.serverNow,
    playback?.updatedBy,
  ]);

  const beginSeeking = useCallback(() => {
    setIsSeeking(true);
    const nextValue = clampTime(
      pendingSeekRef.current ?? seekValue ?? liveTime,
      durationSeconds,
    );
    pendingSeekRef.current = nextValue;
    setSeekValue(nextValue);
  }, [durationSeconds, liveTime, seekValue]);

  const updateSeeking = useCallback((nextValue) => {
    const clamped = clampTime(nextValue, durationSeconds);
    pendingSeekRef.current = clamped;
    setSeekValue(clamped);
  }, [durationSeconds]);

  const commitSeeking = useCallback((nextValue) => {
    const clamped = clampTime(
      nextValue ?? pendingSeekRef.current ?? seekValue ?? liveTime,
      durationSeconds,
    );
    setIsSeeking(false);
    setSeekValue(null);
    pendingSeekRef.current = null;
    onSeekCommit(clamped);
  }, [durationSeconds, liveTime, onSeekCommit, seekValue]);

  const cancelSeeking = useCallback(() => {
    setIsSeeking(false);
    setSeekValue(null);
    pendingSeekRef.current = null;
  }, []);

  return {
    displayTime,
    durationSeconds,
    maxDuration,
    isSeeking,
    beginSeeking,
    updateSeeking,
    commitSeeking,
    cancelSeeking,
  };
}
