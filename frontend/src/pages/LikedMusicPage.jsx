import { useEffect, useState } from "react";
import { IoHeart, IoTimeOutline, IoHeartOutline, IoPlay, IoPause } from "react-icons/io5";
import { useSelector } from "react-redux";
import { usePlaybackActions } from "../components/playback/usePlaybackActions.js";
import { fetchPlaybackTracks } from "../api/playbackApi.js";
import { fetchUserPlaylists, addTrackToPlaylist } from "../api/playlistsApi.js";

const LikedMusicPage = () => {
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToPlaylist, setAddingToPlaylist] = useState(null);
  const playback = useSelector((s) => s.playback);
  const { emitPlaySelection, emitPlay, emitPause } = usePlaybackActions();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tracksData, playlistsData] = await Promise.all([
        fetchPlaybackTracks(),
        fetchUserPlaylists(),
      ]);
      setTracks(tracksData);
      setPlaylists(playlistsData);
    } catch (err) {
      console.error(err);
      setError("Failed to load songs and playlists");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (track, playlistId) => {
    try {
      setAddingToPlaylist(`${track.id}-${playlistId}`);
      const updatedPlaylist = await addTrackToPlaylist(playlistId, {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        url: track.url,
        duration: track.duration,
        durationSeconds: track.durationSeconds,
      });
      if (updatedPlaylist) {
        setPlaylists(prev =>
          prev.map(p =>
            p.id === playlistId ? updatedPlaylist : p
          )
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add track to playlist");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handlePlayTrack = (track, trackIndex) => {
    const isCurrent = playback.currentTrack?.id === track.id;
    if (isCurrent) {
      if (playback.isPlaying) emitPause();
      else emitPlay();
    } else {
      emitPlaySelection(tracks, trackIndex);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-emerald-900/20 to-transparent px-8 py-8">
        <div className="mx-auto flex max-w-5xl items-end gap-6">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-800 shadow-2xl shadow-emerald-950/50">
            <IoHeart className="text-6xl text-white/90 drop-shadow-lg" />
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              All Songs
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white md:text-5xl">
              Available Tracks
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {loading ? "Loading..." : `${tracks.length} songs available`}
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-8">
        <div className="mx-auto max-w-5xl">
          {error && (
            <p className="rounded-lg border border-red-500 bg-red-900/40 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-3 border-b border-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="w-8 shrink-0 text-center">#</span>
            <span className="min-w-0 flex-1">Title</span>
            <span className="hidden min-w-0 flex-1 sm:block">Album</span>
            <span className="flex w-14 shrink-0 items-center justify-end">
              <IoTimeOutline className="text-base" />
            </span>
            <span className="w-12 shrink-0"></span>
          </div>

          <ul className="divide-y divide-white/[0.04]">
            {tracks.map((track, i) => (
              <li
                key={track.id}
                onClick={() => handlePlayTrack(track, i)}
                className="group cursor-pointer flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/[0.06]"
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500">
                  <span className="tabular-nums ">{i + 1}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-zinc-400">{track.artist}</p>
                  </div>
                </div>
                <p className="hidden min-w-0 flex-1 truncate text-zinc-400 sm:block">{track.album || "Unknown"}</p>
                <p className="w-14 shrink-0 text-right tabular-nums text-zinc-500">{track.duration || "—"}</p>
                <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handlePlayTrack(track, i);
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-white transition"
                    aria-label="Play track"
                  >
                    {playback.currentTrack?.id === track.id && playback.isPlaying ? (
                      <IoPause className="text-lg" />
                    ) : (
                      <IoPlay className="text-lg" />
                    )}
                  </button>
                  <div className="relative group/like">
                    <button
                      type="button"
                      className="p-1 rounded text-zinc-400 hover:text-white transition"
                      onClick={() => {
                        // Toggle dropdown or show playlist options
                      }}
                    >
                      <IoHeartOutline className="text-lg" />
                    </button>
                    {/* Playlist dropdown */}
                    <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg opacity-0 invisible group-hover/like:opacity-100 group-hover/like:visible transition-all z-10 min-w-[200px]">
                      <div className="p-2">
                        <p className="text-xs text-zinc-400 mb-2">Add to playlist</p>
                        {playlists.length === 0 ? (
                          <p className="text-xs text-zinc-500">No playlists yet</p>
                        ) : (
                          playlists.map(playlist => (
                            <button
                              key={playlist.id}
                              onClick={() => handleAddToPlaylist(track, playlist.id)}
                              disabled={addingToPlaylist === `${track.id}-${playlist.id}`}
                              className="w-full text-left px-2 py-1 text-sm text-white hover:bg-zinc-800 rounded disabled:opacity-50"
                            >
                              {playlist.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LikedMusicPage;
