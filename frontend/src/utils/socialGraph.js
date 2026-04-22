import { normalizeUserId } from "./messageConversation.js";

export function getFriendIds(authUser) {
  if (Array.isArray(authUser?.friendIds)) {
    return authUser.friendIds.map((id) => normalizeUserId(id));
  }

  if (Array.isArray(authUser?.friends)) {
    return authUser.friends.map((friend) => normalizeUserId(friend?._id));
  }

  return [];
}

export function isFriendWithUser(authUser, userId) {
  if (!userId) return false;
  const targetId = normalizeUserId(userId);
  return getFriendIds(authUser).includes(targetId);
}

export function filterFriendUsers(users, authUser) {
  const friendIds = new Set(getFriendIds(authUser));
  return (users || []).filter((user) => friendIds.has(normalizeUserId(user?._id)));
}

export function filterDiscoverUsers(users, authUser) {
  const friendIds = new Set(getFriendIds(authUser));
  return (users || []).filter((user) => !friendIds.has(normalizeUserId(user?._id)));
}
