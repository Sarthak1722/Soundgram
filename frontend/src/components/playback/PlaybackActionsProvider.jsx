import { usePlaybackSocket } from "../../hooks/usePlaybackSocket.js";
import { PlaybackActionsContext } from "./playbackActionsContext.js";

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
