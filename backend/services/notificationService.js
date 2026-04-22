import { Notification } from "../models/notificationModel.js";
import { User } from "../models/userModel.js";

function normalizeId(value) {
  return value != null ? String(value) : "";
}

function uniqueRecipientIds(recipientIds = [], actorId) {
  const actor = normalizeId(actorId);
  return [...new Set((recipientIds || []).map((id) => normalizeId(id)).filter(Boolean))].filter(
    (id) => id !== actor,
  );
}

async function loadFriendIds(userId) {
  const user = await User.findById(userId).select("friends").lean();
  return (user?.friends || []).map((id) => normalizeId(id));
}

export async function notifyFriendAdded({ actorId, recipientId }) {
  const actor = normalizeId(actorId);
  const recipient = normalizeId(recipientId);

  if (!actor || !recipient || actor === recipient) return;

  await Notification.findOneAndUpdate(
    { dedupeKey: `friend-added:${actor}:${recipient}` },
    {
      recipient,
      actor,
      type: "friend_added",
      dedupeKey: `friend-added:${actor}:${recipient}`,
      createdAt: new Date(),
      readAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function notifyPostCreated({ actorId, postId }) {
  const recipients = uniqueRecipientIds(await loadFriendIds(actorId), actorId);
  if (!recipients.length) return;

  await Notification.bulkWrite(
    recipients.map((recipientId) => ({
      updateOne: {
        filter: { dedupeKey: `post-created:${postId}:${recipientId}` },
        update: {
          $set: {
            recipient: recipientId,
            actor: actorId,
            type: "post_created",
            post: postId,
            dedupeKey: `post-created:${postId}:${recipientId}`,
            readAt: null,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );
}

export async function notifyPostLiked({ actorId, postId, ownerId, active }) {
  const actorFriendIds = await loadFriendIds(actorId);
  const recipients = uniqueRecipientIds([...actorFriendIds, ownerId], actorId);
  if (!recipients.length) return;

  const dedupeKeys = recipients.map((recipientId) => `post-liked:${postId}:${actorId}:${recipientId}`);

  if (!active) {
    await Notification.deleteMany({ dedupeKey: { $in: dedupeKeys } });
    return;
  }

  await Notification.bulkWrite(
    recipients.map((recipientId) => ({
      updateOne: {
        filter: { dedupeKey: `post-liked:${postId}:${actorId}:${recipientId}` },
        update: {
          $set: {
            recipient: recipientId,
            actor: actorId,
            type: "post_liked",
            post: postId,
            dedupeKey: `post-liked:${postId}:${actorId}:${recipientId}`,
            readAt: null,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
  );
}

export async function notifyPostCommented({ actorId, postId, ownerId, commentId, commentText }) {
  const actorFriendIds = await loadFriendIds(actorId);
  const recipients = uniqueRecipientIds([...actorFriendIds, ownerId], actorId);
  if (!recipients.length) return;

  await Notification.insertMany(
    recipients.map((recipientId) => ({
      recipient: recipientId,
      actor: actorId,
      type: "post_commented",
      post: postId,
      commentText: String(commentText || "").slice(0, 1000),
      dedupeKey: `post-commented:${commentId}:${recipientId}`,
    })),
    { ordered: false },
  );
}
