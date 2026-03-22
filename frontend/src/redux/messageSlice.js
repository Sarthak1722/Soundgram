import { createSlice } from "@reduxjs/toolkit";

function normalizeId(id) {
  return id != null ? String(id) : "";
}

/**
 * Chat messages for the open conversation + pagination + typing from peer.
 */
const messageSlice = createSlice({
  name: "messages",
  initialState: {
    messages: [],
    hasMoreOlder: true,
    peerTyping: false,
  },
  reducers: {
    resetThread: (state) => {
      state.messages = [];
      state.hasMoreOlder = true;
      state.peerTyping = false;
    },
    setThreadPage: (state, action) => {
      const { messages, hasMore, prepend } = action.payload;
      const list = Array.isArray(messages) ? messages : [];
      if (prepend) {
        const existing = new Set(state.messages.map((m) => normalizeId(m._id)));
        const older = list.filter((m) => !existing.has(normalizeId(m._id)));
        state.messages = [...older, ...state.messages];
      } else {
        state.messages = list;
      }
      state.hasMoreOlder = hasMore !== false;
    },
    /** Optimistic outgoing bubble */
    addOptimisticMessage: (state, action) => {
      const m = action.payload;
      if (state.messages.some((x) => x.clientMessageId === m.clientMessageId)) return;
      state.messages.push(m);
    },
    /** Replace optimistic row when socket delivers the real message */
    receiveSocketMessage: (state, action) => {
      const msg = action.payload;
      const cid = msg.clientMessageId;
      if (cid) {
        const i = state.messages.findIndex(
          (m) =>
            m.clientMessageId === cid ||
            (m._optimistic && String(m._id).startsWith("temp:") && m.clientMessageId === cid),
        );
        if (i !== -1) {
          state.messages[i] = { ...msg, _optimistic: false, sendState: undefined };
          return;
        }
      }
      const j = state.messages.findIndex(
        (m) => normalizeId(m._id) === normalizeId(msg._id),
      );
      if (j !== -1) {
        state.messages[j] = { ...state.messages[j], ...msg };
        return;
      }
      state.messages.push(msg);
    },
    removeOptimisticMessage: (state, action) => {
      const clientMessageId = action.payload;
      state.messages = state.messages.filter((m) => m.clientMessageId !== clientMessageId);
    },
    applyMessagesRead: (state, action) => {
      const { messageIds, readAt } = action.payload;
      const set = new Set((messageIds || []).map((id) => normalizeId(id)));
      state.messages.forEach((m) => {
        if (set.has(normalizeId(m._id))) m.readAt = readAt;
      });
    },
    setPeerTyping: (state, action) => {
      state.peerTyping = Boolean(action.payload);
    },
  },
});

export const {
  resetThread,
  setThreadPage,
  addOptimisticMessage,
  receiveSocketMessage,
  removeOptimisticMessage,
  applyMessagesRead,
  setPeerTyping,
} = messageSlice.actions;

export default messageSlice.reducer;
