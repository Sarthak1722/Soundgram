import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const DEFAULT_LIMIT = 40;

/**
 * Persist a message. UI confirms via socket `newMessage` (with optional clientMessageId).
 */
export async function sendChatMessage(receiverId, text, clientMessageId) {
  const { data } = await axios.post(
    `${API_URL}/api/v1/message/send/${receiverId}`,
    { message: text, clientMessageId },
    { withCredentials: true },
  );
  return data;
}

/**
 * Paginated thread: omit `before` for newest page; pass oldest message _id for older.
 */
export async function fetchMessagesPage(peerId, { before, limit = DEFAULT_LIMIT } = {}) {
  const params = { limit };
  if (before) params.before = before;
  const { data } = await axios.get(`${API_URL}/api/v1/message/${peerId}`, {
    params,
    withCredentials: true,
  });
  return {
    messages: Array.isArray(data.messages) ? data.messages : [],
    hasMore: Boolean(data.hasMore),
  };
}
