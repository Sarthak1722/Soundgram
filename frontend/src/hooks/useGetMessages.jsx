import { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { resetThread, setThreadPage } from "../redux/messageSlice.js";
import { fetchMessagesPage } from "../api/messagesApi.js";

/**
 * Initial page + load older for infinite scroll. Resets when peer changes.
 */
export function useGetMessages() {
  const dispatch = useDispatch();
  const peerId = useSelector((store) => store.user.selectedUser?._id);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const hasMoreOlder = useSelector((s) => s.messages.hasMoreOlder);
  const messages = useSelector((s) => s.messages.messages);

  useEffect(() => {
    if (peerId == null) {
      dispatch(resetThread());
      return;
    }

    const id = String(peerId);
    dispatch(resetThread());
    let cancelled = false;
    setLoadingInitial(true);

    (async () => {
      try {
        const { messages: page, hasMore } = await fetchMessagesPage(id);
        if (cancelled) return;
        dispatch(setThreadPage({ messages: page, hasMore, prepend: false }));
      } catch (e) {
        console.error("fetchMessages failed", e);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peerId, dispatch]);

  const loadOlder = useCallback(async () => {
    if (!peerId || loadingOlder || !hasMoreOlder || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest?._id || String(oldest._id).startsWith("temp:")) return;

    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchMessagesPage(String(peerId), {
        before: oldest._id,
      });
      dispatch(setThreadPage({ messages: older, hasMore, prepend: true }));
    } catch (e) {
      console.error("loadOlder messages failed", e);
    } finally {
      setLoadingOlder(false);
    }
  }, [peerId, loadingOlder, hasMoreOlder, messages, dispatch]);

  return { loadingInitial, loadingOlder, loadOlder, hasMoreOlder };
}

export default useGetMessages;
