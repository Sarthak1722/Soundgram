import { randomUUID } from "crypto";
import path from "path";
import { appendTrackCatalogEntry, loadTrackCatalog, toPlaybackTrack } from "../playback/trackCatalog.js";

function titleFromFileName(name = "") {
  const cleaned = String(name)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Untitled track";
  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Phase 1: static files + manifest. Phase 2: replace body with Spotify adapter.
 */
export const listPlaybackTracks = (req, res) => {
  try {
    const raw = loadTrackCatalog();
    const tracks = raw.map((t) => toPlaybackTrack(t));
    return res.status(200).json({ tracks });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to load track catalog" });
  }
};

export const uploadPlaybackTrack = (req, res) => {
  try {
    if (!req.file?.filename) {
      return res.status(400).json({ message: "Choose an MP3 file to upload." });
    }

    const defaultTitle = titleFromFileName(path.parse(req.file.originalname || req.file.filename).name);
    const title = String(req.body.title || defaultTitle).trim() || defaultTitle;
    const artist = String(req.body.artist || "Local upload").trim() || "Local upload";
    const album = String(req.body.album || "Available songs").trim() || "Available songs";
    const duration = String(req.body.duration || "").trim();

    if (!duration) {
      return res.status(400).json({ message: "Add the song duration before uploading." });
    }

    const track = appendTrackCatalogEntry({
      id: `track-${randomUUID()}`,
      title,
      artist,
      album,
      duration,
      file: req.file.filename,
    });

    return res.status(201).json({
      success: true,
      message: "Song added to your library.",
      track: toPlaybackTrack(track),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload track." });
  }
};
