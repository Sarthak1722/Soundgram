import mongoose from "mongoose";
import { Notification } from "../models/notificationModel.js";

function normalizeId(value) {
  return value != null ? String(value) : "";
}

function serializeNotification(notification) {
  return {
    _id: normalizeId(notification?._id),
    type: notification?.type || "",
    createdAt: notification?.createdAt,
    readAt: notification?.readAt || null,
    commentText: notification?.commentText || "",
    actor:
      notification?.actor && typeof notification.actor === "object"
        ? {
            _id: normalizeId(notification.actor._id),
            fullName: notification.actor.fullName || "",
            userName: notification.actor.userName || "",
            profilePhoto: notification.actor.profilePhoto || "",
          }
        : { _id: normalizeId(notification?.actor) },
    post:
      notification?.post && typeof notification.post === "object"
        ? {
            _id: normalizeId(notification.post._id),
            mediaType: notification.post.mediaType || "",
            previewUrl: notification.post.thumbnailUrl || notification.post.mediaUrl || "",
            author:
              notification.post.author && typeof notification.post.author === "object"
                ? {
                    _id: normalizeId(notification.post.author._id),
                    userName: notification.post.author.userName || "",
                  }
                : { _id: normalizeId(notification.post.author) },
          }
        : null,
  };
}

export const getNotifications = async (req, res) => {
  try {
    const userId = String(req.id);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const notifications = await Notification.find({ recipient: userId })
      .populate("actor", "fullName userName profilePhoto")
      .populate({
        path: "post",
        select: "mediaType mediaUrl thumbnailUrl author",
        populate: {
          path: "author",
          select: "userName",
        },
      })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    return res.status(200).json({
      success: true,
      notifications: notifications.map((notification) => serializeNotification(notification)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load notifications." });
  }
};
