/**
 * Normalize user ids from API / Socket.IO (string, ObjectId, or populated { _id }).
 */
export function normalizeUserId(id) {
  if (id == null) return "";
  if (typeof id === "object" && id !== null) {
    if (id._id != null) return String(id._id);
  }
  return String(id);
}

/**
 * True if the message belongs to the 1:1 thread between authUserId and peerUserId.
 */
export function isMessageInConversation(message, authUserId, peerUserId) {
  if (!message || authUserId == null || peerUserId == null) return false;

  const s = normalizeUserId(message.senderID);
  const r = normalizeUserId(message.receiverID);
  const me = normalizeUserId(authUserId);
  const peer = normalizeUserId(peerUserId);

  if (!s || !r || !me || !peer) return false;
  return (s === me && r === peer) || (s === peer && r === me);
}

export function isUserOnline(onlineUsers, userId) {
  if (!onlineUsers?.length || userId == null) return false;
  const needle = normalizeUserId(userId);
  return onlineUsers.some((id) => normalizeUserId(id) === needle);
}
