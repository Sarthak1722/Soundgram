import { getTrackDurationSeconds } from "./trackDuration.js";

export function normalizePlaybackTrack(track) {
  if (!track) {
    return null;
  }

  const id = track.id ?? track.trackId ?? track._id ?? null;
  const url = track.url ?? null;

  if (!id || !url) {
    return null;
  }

  const duration =
    typeof track.duration === "string"
      ? track.duration
      : track.durationSeconds != null
        ? String(track.durationSeconds)
        : "";

  return {
    id: String(id),
    trackId: String(track.trackId ?? id),
    _id: String(track._id ?? id),
    title: track.title ?? "",
    artist: track.artist ?? "",
    album: track.album ?? "",
    url,
    duration,
    durationSeconds: getTrackDurationSeconds(track),
    addedAt: track.addedAt ?? null,
  };
}

export function normalizePlaybackQueue(tracks) {
  return (Array.isArray(tracks) ? tracks : [])
    .map(normalizePlaybackTrack)
    .filter(Boolean);
}
