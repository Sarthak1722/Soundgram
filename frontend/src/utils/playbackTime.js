/**
 * Compute live playhead from server anchor + local clock (no audio element required).
 */
export function effectivePlaybackTime(state) {
  if (!state) return 0;
  if (!state.isPlaying || state.playheadEpochMs == null) {
    return Number(state.positionSeconds) || 0;
  }
  return state.positionSeconds + (Date.now() - state.playheadEpochMs) / 1000;
}
