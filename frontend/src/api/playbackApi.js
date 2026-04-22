import apiClient from "./client.js";

/** Phase 1: static catalog. Phase 2: point this at Spotify-backed endpoint. */
export async function fetchPlaybackTracks() {
  const { data } = await apiClient.get("/api/v1/playback/tracks");
  return Array.isArray(data.tracks) ? data.tracks : [];
}

export async function uploadPlaybackTrack({ songFile, title, artist, album, duration }) {
  const formData = new FormData();
  formData.append("song", songFile);
  if (title) formData.append("title", title);
  if (artist) formData.append("artist", artist);
  if (album) formData.append("album", album);
  if (duration) formData.append("duration", duration);

  const { data } = await apiClient.post("/api/v1/playback/tracks", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data.track;
}
