import apiClient from "./client.js";

function normalizeTrack(track) {
  if (!track) {
    return null;
  }

  return {
    _id: track._id ?? track.trackId ?? track.id ?? null,
    id: track.id ?? track.trackId ?? track._id ?? null,
    trackId: track.trackId ?? track.id ?? track._id ?? null,
    title: track.title ?? "",
    artist: track.artist ?? "",
    url: track.url ?? "",
    duration: track.duration ?? "",
    durationSeconds: track.durationSeconds ?? null,
    addedAt: track.addedAt ?? null,
  };
}

function normalizePlaylist(playlist) {
  const tracksSource = Array.isArray(playlist?.songs)
    ? playlist.songs
    : Array.isArray(playlist?.tracks)
      ? playlist.tracks
      : [];
  const tracks = tracksSource.map(normalizeTrack).filter(Boolean);
  const trackIds = Array.isArray(playlist?.trackIds)
    ? playlist.trackIds
    : tracks.map((track) => track.trackId).filter(Boolean);

  return {
    ...playlist,
    _id: playlist?._id ?? playlist?.id ?? null,
    id: playlist?.id ?? playlist?._id ?? null,
    tracks,
    songs: tracks,
    trackIds,
    trackCount: playlist?.trackCount ?? tracks.length,
  };
}

/**
 * Get all playlists for the current user
 */
export async function fetchUserPlaylists() {
  const { data } = await apiClient.get("/api/v1/playlists");
  return data.success ? data.playlists.map(normalizePlaylist) : [];
}

/**
 * Create a new playlist
 */
export async function createPlaylist(playlistData) {
  const { data } = await apiClient.post("/api/v1/playlists", playlistData);
  return data.success ? normalizePlaylist(data.playlist) : null;
}

/**
 * Get a specific playlist with full details
 */
export async function fetchPlaylist(playlistId) {
  const { data } = await apiClient.get(`/api/v1/playlists/${playlistId}`);
  return data.success ? normalizePlaylist(data.playlist) : null;
}

/**
 * Update playlist metadata
 */
export async function updatePlaylist(playlistId, updateData) {
  const { data } = await apiClient.put(`/api/v1/playlists/${playlistId}`, updateData);
  return data.success ? normalizePlaylist(data.playlist) : null;
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId) {
  const { data } = await apiClient.delete(`/api/v1/playlists/${playlistId}`);
  return data.success;
}

/**
 * Add a track to a playlist
 */
export async function addTrackToPlaylist(playlistId, trackData) {
  const { data } = await apiClient.post(`/api/v1/playlists/${playlistId}/tracks`, trackData);
  return data.success ? normalizePlaylist(data.playlist) : null;
}

/**
 * Remove a track from a playlist
 */
export async function removeTrackFromPlaylist(playlistId, trackId) {
  const { data } = await apiClient.delete(`/api/v1/playlists/${playlistId}/tracks/${trackId}`);
  return data.success;
}
