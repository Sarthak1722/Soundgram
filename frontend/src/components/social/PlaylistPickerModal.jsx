import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { IoAddOutline, IoClose } from "react-icons/io5";
import {
  addTrackToPlaylist,
  createPlaylist,
  fetchUserPlaylists,
} from "../../api/playlistsApi.js";

const PlaylistPickerModal = ({ open, track, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [savingPlaylistId, setSavingPlaylistId] = useState(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadPlaylists = async () => {
      try {
        setLoading(true);
        const nextPlaylists = await fetchUserPlaylists();
        if (!cancelled) {
          setPlaylists(nextPlaylists);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load playlists.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPlaylists();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open || !track) return null;

  const trackPayload = {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    url: track.url,
    duration: track.duration,
    durationSeconds: track.durationSeconds,
  };

  const addToPlaylist = async (playlistId) => {
    setSavingPlaylistId(String(playlistId));
    try {
      await addTrackToPlaylist(playlistId, trackPayload);
      toast.success(`Added "${track.title}" to playlist.`);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add the song.");
    } finally {
      setSavingPlaylistId(null);
    }
  };

  const handleCreatePlaylist = async (event) => {
    event.preventDefault();
    const trimmedName = playlistName.trim();
    if (!trimmedName) {
      toast.error("Give the playlist a name first.");
      return;
    }

    setCreating(true);
    try {
      const newPlaylist = await createPlaylist({
        name: trimmedName,
        description: "Created from search",
      });
      if (!newPlaylist?.id) {
        throw new Error("Playlist creation failed");
      }
      await addTrackToPlaylist(newPlaylist.id, trackPayload);
      toast.success(`Created "${trimmedName}" and added the song.`);
      setPlaylistName("");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create the playlist.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_24px_90px_rgba(0,0,0,0.52)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Add to playlist</p>
            <p className="text-xs text-zinc-500">{track.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close playlist picker"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <form onSubmit={handleCreatePlaylist} className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.02] p-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Create new playlist
            </label>
            <div className="flex gap-3">
              <input
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
                placeholder="Playlist name"
                className="flex-1 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
              >
                <IoAddOutline />
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Choose playlist
            </p>
            {loading ? (
              <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
                Loading playlists...
              </div>
            ) : playlists.length ? (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => addToPlaylist(playlist.id)}
                    disabled={savingPlaylistId === String(playlist.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{playlist.name}</p>
                      <p className="text-xs text-zinc-500">{playlist.trackCount || 0} songs</p>
                    </div>
                    <span className="text-xs font-medium text-zinc-300">
                      {savingPlaylistId === String(playlist.id) ? "Adding..." : "Add"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
                No playlists yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistPickerModal;
