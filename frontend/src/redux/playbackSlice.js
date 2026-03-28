import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  roomId: null,
  currentTrack: null,
  isPlaying: false,
  positionSeconds: 0,
  playheadEpochMs: null,
  serverNow: null,
  updatedBy: null,
  queue: [],
  queueIndex: -1,
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
      const isRemoteSnapshot =
        p.serverNow !== undefined && p.serverNow !== null && p.currentTime !== undefined;

      if ("roomId" in p) state.roomId = p.roomId;
      if (p.currentTrack !== undefined) {
        state.currentTrack = p.currentTrack;
      }
      if (p.isPlaying !== undefined) {
        state.isPlaying = Boolean(p.isPlaying);
      }

      if (isRemoteSnapshot) {
        state.positionSeconds = Number(p.currentTime) || 0;
        state.playheadEpochMs = state.isPlaying ? Date.now() : null;
      } else {
        if (p.positionSeconds !== undefined) {
          state.positionSeconds = Number(p.positionSeconds) || 0;
        } else if (p.currentTime !== undefined) {
          state.positionSeconds = Number(p.currentTime) || 0;
        }

        if (p.playheadEpochMs === null || p.playheadEpochMs === undefined) {
          state.playheadEpochMs = null;
        } else {
          state.playheadEpochMs = Number(p.playheadEpochMs);
        }
      }

      if (Array.isArray(p.queue)) {
        state.queue = p.queue;
      }
      if (p.queueIndex !== undefined) {
        state.queueIndex = Number(p.queueIndex);
      }
      state.serverNow = p.serverNow != null ? Number(p.serverNow) : null;
      state.updatedBy = p.updatedBy != null ? String(p.updatedBy) : null;
    },
    setPlaybackQueue: (state, action) => {
      const { tracks = [], startIndex = 0 } = action.payload || {};
      state.queue = Array.isArray(tracks) ? tracks : [];
      if (state.queue.length > 0) {
        const idx = Number(startIndex) || 0;
        state.queueIndex = ((idx % state.queue.length) + state.queue.length) % state.queue.length;
      } else {
        state.queueIndex = -1;
      }
    },
    setPlaybackQueueIndex: (state, action) => {
      const index = Number(action.payload);
      if (!Array.isArray(state.queue) || state.queue.length === 0) {
        state.queueIndex = -1;
        return;
      }
      state.queueIndex = ((index % state.queue.length) + state.queue.length) % state.queue.length;
    },
    setCurrentTrack: (state, action) => {
      state.currentTrack = action.payload;
      if (Array.isArray(state.queue) && state.queue.length > 0) {
        const trackIndex = state.queue.findIndex(track => track.id === action.payload?.id);
        if (trackIndex >= 0) {
          state.queueIndex = trackIndex;
        }
      }
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = Boolean(action.payload);
      if (state.isPlaying && state.currentTrack) {
        state.playheadEpochMs = Date.now();
      } else {
        state.playheadEpochMs = null;
      }
    },
    playNext: (state) => {
      if (!Array.isArray(state.queue) || state.queue.length === 0) return;
      const nextIndex = (state.queueIndex + 1) % state.queue.length;
      state.queueIndex = nextIndex;
      state.currentTrack = state.queue[nextIndex];
      state.isPlaying = true;
      state.positionSeconds = 0;
      state.playheadEpochMs = Date.now();
    },
    playPrevious: (state) => {
      if (!Array.isArray(state.queue) || state.queue.length === 0) return;
      const prevIndex = state.queueIndex <= 0 ? state.queue.length - 1 : state.queueIndex - 1;
      state.queueIndex = prevIndex;
      state.currentTrack = state.queue[prevIndex];
      state.isPlaying = true;
      state.positionSeconds = 0;
      state.playheadEpochMs = Date.now();
    },
    resetPlayback: () => ({ ...initialState }),
  },
});

export const {
  applyPlaybackUpdate,
  setPlaybackQueue,
  setPlaybackQueueIndex,
  setCurrentTrack,
  setIsPlaying,
  playNext,
  playPrevious,
  resetPlayback,
} = playbackSlice.actions;

export default playbackSlice.reducer;
