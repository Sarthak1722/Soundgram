import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

/** Phase 1: static catalog. Phase 2: point this at Spotify-backed endpoint. */
export async function fetchPlaybackTracks() {
  const { data } = await axios.get(`${API_URL}/api/v1/playback/tracks`, {
    withCredentials: true,
  });
  return Array.isArray(data.tracks) ? data.tracks : [];
}
