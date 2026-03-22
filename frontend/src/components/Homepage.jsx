import { Outlet } from "react-router-dom";
import MainNav from "./MainNav.jsx";
import PlaybackActionsProvider from "./playback/PlaybackActionsProvider.jsx";
import GlobalPlaybackBar from "./playback/GlobalPlaybackBar.jsx";

const Homepage = () => {
  return (
    <PlaybackActionsProvider>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0a0a0a]/90 text-zinc-100 backdrop-blur-sm">
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <MainNav />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        </div>
        <GlobalPlaybackBar />
      </div>
    </PlaybackActionsProvider>
  );
};

export default Homepage;
