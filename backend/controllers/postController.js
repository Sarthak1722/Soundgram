import mongoose from "mongoose";
import { Readable } from "stream";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { Post } from "../models/postModel.js";
import {
  notifyPostCommented,
  notifyPostCreated,
  notifyPostLiked,
} from "../services/notificationService.js";

function inferMediaType(mimetype = "", uploadedResourceType = "") {
  if (mimetype.startsWith("video/") || uploadedResourceType === "video") {
    return "video";
  }

  return "image";
}

function uploadBufferToCloudinary(file, authorId) {
  const resourceType = file.mimetype?.startsWith("video/") ? "video" : "image";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "soundgram/posts",
        resource_type: resourceType,
        public_id: `user-${authorId}-${Date.now()}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    const inputStream = new Readable({
      read() {
        this.push(file.buffer);
        this.push(null);
      },
    });

    inputStream.pipe(uploadStream);
  });
}

function normalizeId(value) {
  return value != null ? String(value) : "";
}

function serializeComment(comment, viewerId) {
  const author =
    comment.author && typeof comment.author === "object"
      ? {
          _id: normalizeId(comment.author._id),
          fullName: comment.author.fullName || "",
          userName: comment.author.userName || "",
          profilePhoto: comment.author.profilePhoto || "",
        }
      : { _id: normalizeId(comment.author) };

  return {
    _id: normalizeId(comment._id),
    author,
    text: comment.text || "",
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isOwnComment: normalizeId(author._id) === normalizeId(viewerId),
  };
}

function serializePost(post, viewerId) {
  const likeIds = Array.isArray(post.likes) ? post.likes.map((id) => normalizeId(id)) : [];
  const comments = Array.isArray(post.comments)
    ? post.comments.map((comment) => serializeComment(comment, viewerId))
    : [];

  return {
    _id: normalizeId(post._id),
    author:
      post.author && typeof post.author === "object"
        ? {
            _id: normalizeId(post.author._id),
            fullName: post.author.fullName || "",
            userName: post.author.userName || "",
            profilePhoto: post.author.profilePhoto || "",
          }
        : { _id: normalizeId(post.author) },
    caption: post.caption || "",
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    mediaPublicId: post.mediaPublicId,
    thumbnailUrl: post.thumbnailUrl || "",
    width: post.width ?? null,
    height: post.height ?? null,
    likes: likeIds,
    likeCount: likeIds.length,
    viewerHasLiked: likeIds.includes(normalizeId(viewerId)),
    comments,
    commentCount: comments.length,
    shareCount: post.shareCount || 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

async function findPostWithAuthor(postId) {
  return Post.findById(postId)
    .populate("author", "fullName userName profilePhoto")
    .populate("comments.author", "fullName userName profilePhoto")
    .lean();
}

async function listPosts(filter = {}) {
  return Post.find(filter)
    .populate("author", "fullName userName profilePhoto")
    .populate("comments.author", "fullName userName profilePhoto")
    .sort({ createdAt: -1 })
    .lean();
}

async function findOwnedPost(postId, ownerId) {
  return Post.findOne({ _id: postId, author: ownerId });
}

async function destroyPostMedia(post) {
  if (!post?.mediaPublicId || !isCloudinaryConfigured()) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(post.mediaPublicId, {
      resource_type: post.mediaType === "video" ? "video" : "image",
    });
  } catch (error) {
    console.error("Failed to remove post media from Cloudinary:", error);
  }
}

export const createPost = async (req, res) => {
  try {
    if (!req.id || !mongoose.Types.ObjectId.isValid(String(req.id))) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        message: "Cloudinary is not configured yet. Add your Cloudinary credentials to backend/.env.",
      });
    }

    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Select an image or video to post." });
    }

    const caption = String(req.body.caption || "").trim();
    const uploaded = await uploadBufferToCloudinary(req.file, req.id);
    const mediaType = inferMediaType(req.file.mimetype, uploaded?.resource_type);
    const thumbnailUrl =
      mediaType === "video"
        ? cloudinary.url(uploaded.public_id, {
            resource_type: "video",
            format: "jpg",
            secure: true,
          })
        : uploaded?.secure_url || "";

    const post = await Post.create({
      author: req.id,
      caption,
      mediaUrl: uploaded.secure_url,
      mediaType,
      mediaPublicId: uploaded.public_id,
      thumbnailUrl,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
    });

    const populated = await findPostWithAuthor(post._id);
    await notifyPostCreated({ actorId: req.id, postId: post._id });

    return res.status(201).json({
      success: true,
      message: "Post created",
      post: serializePost(populated, req.id),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create post." });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    if (!req.id || !mongoose.Types.ObjectId.isValid(String(req.id))) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const posts = await listPosts();

    return res.status(200).json({
      success: true,
      posts: posts.map((post) => serializePost(post, req.id)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load feed." });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    if (!req.id || !mongoose.Types.ObjectId.isValid(String(req.id))) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const userId = String(req.params.userId || req.id);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const posts = await listPosts({ author: userId });

    return res.status(200).json({
      success: true,
      posts: posts.map((post) => serializePost(post, req.id)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load posts." });
  }
};

export const togglePostLike = async (req, res) => {
  try {
    const viewerId = String(req.id);
    const postId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const post = await Post.findById(postId).select("likes author");
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const hasLiked = (post.likes || []).some((likeId) => normalizeId(likeId) === viewerId);
    if (hasLiked) {
      post.likes = (post.likes || []).filter((likeId) => normalizeId(likeId) !== viewerId);
    } else {
      post.likes.push(new mongoose.Types.ObjectId(viewerId));
    }
    await post.save();
    await notifyPostLiked({
      actorId: viewerId,
      postId,
      ownerId: post.author,
      active: !hasLiked,
    });

    const populated = await findPostWithAuthor(postId);

    return res.status(200).json({
      success: true,
      post: serializePost(populated, viewerId),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update like." });
  }
};

export const addPostComment = async (req, res) => {
  try {
    const viewerId = String(req.id);
    const postId = String(req.params.id);
    const text = String(req.body.text || "").trim();

    if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid request." });
    }

    if (!text) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    post.comments.push({
      author: new mongoose.Types.ObjectId(viewerId),
      text,
    });
    await post.save();
    const latestComment = post.comments[post.comments.length - 1];
    await notifyPostCommented({
      actorId: viewerId,
      postId,
      ownerId: post.author,
      commentId: latestComment?._id,
      commentText: latestComment?.text || text,
    });

    const populated = await findPostWithAuthor(postId);

    return res.status(201).json({
      success: true,
      post: serializePost(populated, viewerId),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add comment." });
  }
};

export const updatePostCaption = async (req, res) => {
  try {
    const viewerId = String(req.id);
    const postId = String(req.params.id);
    const caption = String(req.body.caption || "").trim();

    if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const post = await findOwnedPost(postId, viewerId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    post.caption = caption;
    await post.save();

    const populated = await findPostWithAuthor(postId);

    return res.status(200).json({
      success: true,
      post: serializePost(populated, viewerId),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update caption." });
  }
};

export const deletePost = async (req, res) => {
  try {
    const viewerId = String(req.id);
    const postId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const post = await findOwnedPost(postId, viewerId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    await destroyPostMedia(post);
    await Post.deleteOne({ _id: postId, author: viewerId });

    return res.status(200).json({
      success: true,
      postId,
      message: "Post deleted.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete post." });
  }
};

export const registerPostShare = async (req, res) => {
  try {
    const viewerId = String(req.id);
    const postId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true },
    );
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const populated = await findPostWithAuthor(postId);

    return res.status(200).json({
      success: true,
      post: serializePost(populated, viewerId),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to register share." });
  }
};
