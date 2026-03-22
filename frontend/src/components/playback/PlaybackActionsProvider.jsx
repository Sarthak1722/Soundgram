import { createContext, useContext } from "react";
import { usePlaybackSocket } from "../../hooks/usePlaybackSocket.js";

const PlaybackActionsContext = createContext(null);

export function usePlaybackActions() {
  const ctx = useContext(PlaybackActionsContext);
  if (!ctx) {
    throw new Error("usePlaybackActions must be used within PlaybackActionsProvider");
  }
  return ctx;
}

/**
 * Single place for playback socket join + listeners; children share one subscription.
 */
export default function PlaybackActionsProvider({ children }) {
  const actions = usePlaybackSocket();
  return (
    <PlaybackActionsContext.Provider value={actions}>
      {children}
    </PlaybackActionsContext.Provider>
  );
}
