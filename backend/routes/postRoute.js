import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  addPostComment,
  createPost,
  deletePost,
  getFeedPosts,
  getUserPosts,
  registerPostShare,
  togglePostLike,
  updatePostCaption,
} from "../controllers/postController.js";
import { postMediaErrorMessage, uploadPostMedia } from "../middleware/uploadPostMedia.js";

const router = express.Router();

router.get("/feed", isAuthenticated, getFeedPosts);
router.get("/user/:userId", isAuthenticated, getUserPosts);
router.get("/me", isAuthenticated, getUserPosts);
router.post("/:id/like", isAuthenticated, togglePostLike);
router.post("/:id/comment", isAuthenticated, addPostComment);
router.put("/:id", isAuthenticated, updatePostCaption);
router.delete("/:id", isAuthenticated, deletePost);
router.post("/:id/share", isAuthenticated, registerPostShare);
router.post(
  "/",
  isAuthenticated,
  (req, res, next) => {
    uploadPostMedia.single("media")(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      const isMulterError = error?.name === "MulterError";
      return res.status(400).json({
        message: isMulterError ? postMediaErrorMessage : error.message || postMediaErrorMessage,
      });
    });
  },
  createPost,
);

export default router;
