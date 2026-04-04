import { useContext } from "react";
import { PlaybackActionsContext } from "./playbackActionsContext.js";

export function usePlaybackActions() {
  const ctx = useContext(PlaybackActionsContext);
  if (!ctx) {
    throw new Error("usePlaybackActions must be used within PlaybackActionsProvider");
  }
  return ctx;
}
