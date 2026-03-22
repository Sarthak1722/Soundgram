import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  roomId: null,
  currentTrack: null,
  isPlaying: false,
  positionSeconds: 0,
  playheadEpochMs: null,
  serverNow: null,
  updatedBy: null,
};

/**
 * Serializable mirror of server playback state (per Socket.IO room). Updated only via playbackUpdate.
 */
const playbackSlice = createSlice({
  name: "playback",
  initialState,
  reducers: {
    applyPlaybackUpdate: (state, action) => {
      const p = action.payload;
      if (p.roomId != null) state.roomId = p.roomId;
      state.currentTrack = p.currentTrack ?? null;
      state.isPlaying = Boolean(p.isPlaying);
      state.positionSeconds =
        typeof p.positionSeconds === "number" ? p.positionSeconds : Number(p.currentTime) || 0;
      state.playheadEpochMs =
        p.playheadEpochMs === null || p.playheadEpochMs === undefined
          ? null
          : Number(p.playheadEpochMs);
      state.serverNow = p.serverNow != null ? Number(p.serverNow) : null;
      state.updatedBy = p.updatedBy != null ? String(p.updatedBy) : null;
    },
    resetPlayback: () => ({ ...initialState }),
  },
});

export const { applyPlaybackUpdate, resetPlayback } = playbackSlice.actions;

export default playbackSlice.reducer;
