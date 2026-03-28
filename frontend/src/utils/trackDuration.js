export function parseTrackDurationSeconds(duration) {
  if (typeof duration === "number" && Number.isFinite(duration)) {
    return Math.max(0, duration);
  }

  if (typeof duration !== "string") {
    return null;
  }

  const parts = duration
    .split(":")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (!parts.length) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function getTrackDurationSeconds(track) {
  const durationSeconds =
    parseTrackDurationSeconds(track?.durationSeconds) ??
    parseTrackDurationSeconds(track?.duration);

  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : null;
}
