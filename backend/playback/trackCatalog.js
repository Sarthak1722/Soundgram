import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const songsDirectoryPath = join(__dirname, "../public/songs");
const trackCatalogPath = join(songsDirectoryPath, "tracks.json");

let cached = null;

function ensureTrackCatalog() {
  if (!existsSync(songsDirectoryPath)) {
    mkdirSync(songsDirectoryPath, { recursive: true });
  }

  if (!existsSync(trackCatalogPath)) {
    writeFileSync(trackCatalogPath, JSON.stringify({ tracks: [] }, null, 2));
  }
}

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

/**
 * Static catalog (phase 1). Phase 2: swap loader for Spotify metadata adapter.
 */
export function loadTrackCatalog() {
  if (cached) return cached;
  try {
    ensureTrackCatalog();
    const raw = readFileSync(trackCatalogPath, "utf8");
    const data = JSON.parse(raw);
    cached = Array.isArray(data.tracks) ? data.tracks : [];
  } catch {
    cached = [];
  }
  return cached;
}

export function saveTrackCatalog(tracks) {
  ensureTrackCatalog();
  const nextTracks = Array.isArray(tracks) ? tracks : [];
  cached = nextTracks;
  writeFileSync(trackCatalogPath, JSON.stringify({ tracks: nextTracks }, null, 2));
  return nextTracks;
}

export function appendTrackCatalogEntry(track) {
  const tracks = loadTrackCatalog().filter((entry) => entry?.id !== track?.id);
  tracks.unshift(track);
  saveTrackCatalog(tracks);
  return track;
}

export function trackById(id) {
  return loadTrackCatalog().find((t) => t.id === id) || null;
}

export function toPlaybackTrack(track) {
  if (!track) return null;
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    durationSeconds: parseTrackDurationSeconds(track.duration),
    url: track.url || `/songs/${track.file}`,
  };
}

export { songsDirectoryPath, trackCatalogPath };
