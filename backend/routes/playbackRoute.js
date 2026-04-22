import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { listPlaybackTracks, uploadPlaybackTrack } from "../controllers/playbackController.js";
import { songUploadErrorMessage, uploadSongFile } from "../middleware/uploadSongFile.js";

const router = express.Router();
router
  .route("/tracks")
  .get(isAuthenticated, listPlaybackTracks)
  .post(
    isAuthenticated,
    (req, res, next) => {
      uploadSongFile.single("song")(req, res, (error) => {
        if (!error) {
          next();
          return;
        }

        const isMulterError = error?.name === "MulterError";
        return res.status(400).json({
          message: isMulterError ? songUploadErrorMessage : error.message || songUploadErrorMessage,
        });
      });
    },
    uploadPlaybackTrack,
  );

export default router;
