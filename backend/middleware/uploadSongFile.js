import path from "path";
import { mkdirSync } from "fs";
import multer from "multer";
import { songsDirectoryPath } from "../playback/trackCatalog.js";

function sanitizeFileBaseName(input) {
  return String(input || "track")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "track";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(songsDirectoryPath, { recursive: true });
    cb(null, songsDirectoryPath);
  },
  filename: (_req, file, cb) => {
    const fileBase = sanitizeFileBaseName(path.parse(file.originalname).name);
    cb(null, `${Date.now()}-${fileBase}.mp3`);
  },
});

function fileFilter(_req, file, cb) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const isMp3 = extension === ".mp3" || file.mimetype === "audio/mpeg";

  if (isMp3) {
    cb(null, true);
    return;
  }

  cb(new Error("Only MP3 uploads are supported"));
}

export const songUploadErrorMessage = "Upload a valid MP3 file.";

export const uploadSongFile = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter,
});
