import {
  loadTrackCatalog,
  parseTrackDurationSeconds,
  trackById,
  toPlaybackTrack,
} from "./trackCatalog.js";

/** @type {Map<string, object>} */
const roomStates = new Map();

export function pairRoomId(userIdA, userIdB) {
  const a = String(userIdA);
  const b = String(userIdB);
  if (!a || !b || a === b) return null;
  return `playback:${[a, b].sort().join(":")}`;
}

function defaultState() {
  return {
    currentTrack: null,
    isPlaying: false,
    positionSeconds: 0,
    playheadEpochMs: null,
    updatedBy: null,
    queue: [],
    queueIndex: -1,
    catalogIndex: 0,
  };
}

function normalizePlaybackTrack(track) {
  if (!track) return null;
  const id = track.id ?? track.trackId ?? track._id ?? null;
  const catalogTrack = id ? trackById(id) : null;
  const url = track.url ?? (catalogTrack?.file ? `/songs/${catalogTrack.file}` : null);
  if (!id || !url) return null;

  return {
    id: String(id),
    title: track.title ?? catalogTrack?.title ?? "",
    artist: track.artist ?? catalogTrack?.artist ?? "",
    album: track.album ?? catalogTrack?.album ?? "",
    duration: track.duration ?? catalogTrack?.duration ?? "",
    durationSeconds:
      parseTrackDurationSeconds(track.durationSeconds) ??
      parseTrackDurationSeconds(track.duration) ??
      parseTrackDurationSeconds(catalogTrack?.duration),
    url,
  };
}

function getTrackDurationSeconds(track) {
  const durationSeconds =
    parseTrackDurationSeconds(track?.durationSeconds) ??
    parseTrackDurationSeconds(track?.duration);

  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : null;
}

function clampPositionToTrack(track, timeSeconds) {
  const normalizedTime = Math.max(0, Number(timeSeconds) || 0);
  const durationSeconds = getTrackDurationSeconds(track);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return normalizedTime;
  }

  return Math.min(normalizedTime, durationSeconds);
}

function buildCatalogQueue() {
  return loadTrackCatalog().map(toPlaybackTrack);
}

function setQueueAndTrack(state, queue, startIndex = 0) {
  state.queue = Array.isArray(queue) ? queue : [];
  if (!state.queue.length) {
    state.queueIndex = -1;
    state.currentTrack = null;
    return false;
  }

  const normalizedIndex = ((Number(startIndex) || 0) % state.queue.length + state.queue.length) % state.queue.length;
  state.queueIndex = normalizedIndex;
  state.currentTrack = state.queue[normalizedIndex];
  return true;
}

export function getOrCreateRoomState(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, defaultState());
  }
  return roomStates.get(roomId);
}

function effectivePositionSeconds(state, now = Date.now()) {
  if (!state.isPlaying || state.playheadEpochMs == null) {
    return clampPositionToTrack(state.currentTrack, state.positionSeconds);
  }

  return clampPositionToTrack(
    state.currentTrack,
    state.positionSeconds + (now - state.playheadEpochMs) / 1000,
  );
}

function freezePosition(state, now = Date.now()) {
  if (state.isPlaying && state.playheadEpochMs != null) {
    state.positionSeconds = effectivePositionSeconds(state, now);
  }
  state.isPlaying = false;
  state.playheadEpochMs = null;
}

function resumeFromAnchor(state, now = Date.now()) {
  state.isPlaying = true;
  state.playheadEpochMs = now;
}

export function buildPlaybackPayload(roomId, state) {
  const now = Date.now();
  const currentTime = effectivePositionSeconds(state, now);
  return {
    roomId,
    currentTrack: state.currentTrack,
    queue: state.queue,
    queueIndex: state.queueIndex,
    isPlaying: state.isPlaying,
    currentTime,
    positionSeconds: state.positionSeconds,
    playheadEpochMs: state.playheadEpochMs,
    serverNow: now,
    updatedBy: state.updatedBy,
  };
}

export function ensureTrackLoaded(state) {
  if (!state.currentTrack) {
    if (Array.isArray(state.queue) && state.queue.length > 0) {
      const idx = state.queueIndex >= 0 ? state.queueIndex : 0;
      return setQueueAndTrack(state, state.queue, idx);
    }

    const catalogQueue = buildCatalogQueue();
    if (!catalogQueue.length) return false;
    state.catalogIndex = 0;
    setQueueAndTrack(state, catalogQueue, 0);
  }
  return true;
}

export function applyPlaySelection(roomId, userId, tracks, startIndex = 0) {
  const state = getOrCreateRoomState(roomId);
  const queue = (Array.isArray(tracks) ? tracks : [])
    .map(normalizePlaybackTrack)
    .filter(Boolean);

  if (!setQueueAndTrack(state, queue, startIndex)) {
    return null;
  }

  state.positionSeconds = 0;
  state.isPlaying = true;
  state.playheadEpochMs = Date.now();
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}

export function applyPlay(roomId, userId) {
  const state = getOrCreateRoomState(roomId);
  if (!ensureTrackLoaded(state)) return null;
  const now = Date.now();
  if (state.isPlaying) {
    state.positionSeconds = effectivePositionSeconds(state, now);
    state.playheadEpochMs = now;
  } else {
    resumeFromAnchor(state, now);
  }
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}

export function applyPause(roomId, userId) {
  const state = getOrCreateRoomState(roomId);
  freezePosition(state);
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}

export function applySeek(roomId, userId, timeSeconds) {
  const state = getOrCreateRoomState(roomId);
  const now = Date.now();
  const wasPlaying = state.isPlaying;
  freezePosition(state, now);
  state.positionSeconds = clampPositionToTrack(state.currentTrack, timeSeconds);
  if (wasPlaying) {
    resumeFromAnchor(state, now);
  }
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}

export function applyChangeTrack(roomId, userId, trackId) {
  const state = getOrCreateRoomState(roomId);
  freezePosition(state);
  const queue = Array.isArray(state.queue) && state.queue.length > 0
    ? state.queue
    : buildCatalogQueue();
  const idx = queue.findIndex((t) => t.id === trackId);
  if (idx < 0) return null;

  state.queue = queue;
  state.queueIndex = idx;
  state.catalogIndex = idx;
  state.currentTrack = queue[idx];
  state.positionSeconds = 0;
  state.isPlaying = true;
  state.playheadEpochMs = Date.now();
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}

export function applyNextTrack(roomId, userId) {
  const state = getOrCreateRoomState(roomId);
  freezePosition(state);
  const queue = Array.isArray(state.queue) && state.queue.length > 0
    ? state.queue
    : buildCatalogQueue();
  if (!queue.length) return null;
  const currentIndex = state.queueIndex >= 0 ? state.queueIndex : 0;
  const nextIndex = (currentIndex + 1) % queue.length;
  state.queue = queue;
  state.queueIndex = nextIndex;
  state.catalogIndex = nextIndex;
  state.currentTrack = queue[nextIndex];
  state.positionSeconds = 0;
  state.isPlaying = true;
  state.playheadEpochMs = Date.now();
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}

export function applyPrevTrack(roomId, userId) {
  const state = getOrCreateRoomState(roomId);
  freezePosition(state);
  const queue = Array.isArray(state.queue) && state.queue.length > 0
    ? state.queue
    : buildCatalogQueue();
  if (!queue.length) return null;
  const currentIndex = state.queueIndex >= 0 ? state.queueIndex : 0;
  const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
  state.queue = queue;
  state.queueIndex = prevIndex;
  state.catalogIndex = prevIndex;
  state.currentTrack = queue[prevIndex];
  state.positionSeconds = 0;
  state.isPlaying = true;
  state.playheadEpochMs = Date.now();
  state.updatedBy = userId;
  return buildPlaybackPayload(roomId, state);
}
