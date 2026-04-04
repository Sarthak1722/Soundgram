import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import MainNav from "./MainNav.jsx";
import PlaybackActionsProvider from "./playback/PlaybackActionsProvider.jsx";
import GlobalPlaybackBar from "./playback/GlobalPlaybackBar.jsx";
import { writeHomeContinuity } from "../utils/homeContinuity.js";

const routeLabels = {
  "/homepage/home": "Home",
  "/homepage/messages": "Messages",
  "/homepage/rooms": "Jam rooms",
  "/homepage/liked": "Tracks",
  "/homepage/playlists": "Playlists",
};

const Homepage = () => {
  const location = useLocation();
  const authUserId = useSelector((store) => store.user.authUser?._id);
  const activeJam = useSelector((store) => store.rooms.activeJam);
  const playbackTrack = useSelector((store) => store.playback.currentTrack);

  useEffect(() => {
    writeHomeContinuity(authUserId, {
      lastPath: location.pathname,
      lastPathLabel: routeLabels[location.pathname] || "App",
    });
  }, [authUserId, location.pathname]);

  useEffect(() => {
    if (!activeJam) return;
    writeHomeContinuity(authUserId, {
      lastJam: {
        kind: activeJam.kind,
        label: activeJam.label,
        roomId: activeJam.roomId || null,
        peerId: activeJam.peerId || null,
      },
    });
  }, [activeJam, authUserId]);

  useEffect(() => {
    if (!playbackTrack?.id) return;
    writeHomeContinuity(authUserId, {
      lastTrack: {
        id: playbackTrack.id,
        title: playbackTrack.title,
        artist: playbackTrack.artist,
      },
    });
  }, [authUserId, playbackTrack]);

  return (
    <PlaybackActionsProvider>
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0a0a0a]/90 text-zinc-100 backdrop-blur-sm">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="hidden lg:flex">
            <MainNav />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+10.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+11.25rem)] lg:pb-0">
            <Outlet />
          </div>
        </div>
        <div className="hidden lg:block">
          <GlobalPlaybackBar />
        </div>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] sm:px-3 lg:hidden">
          <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2">
            <GlobalPlaybackBar mobile />
            <MainNav variant="mobile" />
          </div>
        </div>
      </div>
    </PlaybackActionsProvider>
  );
};

export default Homepage;
