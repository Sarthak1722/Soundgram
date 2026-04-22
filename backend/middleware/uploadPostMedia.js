import multer from "multer";

const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (!file?.mimetype) {
    cb(new Error("Unsupported file type"));
    return;
  }

  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image and video uploads are supported"));
}

export const uploadPostMedia = multer({
  storage,
  limits: { fileSize: MAX_MEDIA_SIZE_BYTES },
  fileFilter,
});

export const postMediaErrorMessage = `Only images and videos up to ${Math.round(
  MAX_MEDIA_SIZE_BYTES / (1024 * 1024),
)} MB are supported right now.`;
