import { Playlist } from "../models/playlistModel.js";
import { User } from "../models/userModel.js";
import { parseTrackDurationSeconds, trackById } from "../playback/trackCatalog.js";

const serializeTrack = (track) => {
  const catalogTrack = trackById(track.trackId);
  const duration =
    track.duration ??
    catalogTrack?.duration ??
    "";
  const durationSeconds =
    parseTrackDurationSeconds(track.durationSeconds) ??
    parseTrackDurationSeconds(track.duration) ??
    parseTrackDurationSeconds(catalogTrack?.duration);

  return {
    trackId: track.trackId,
    id: track.trackId,
    _id: track.trackId,
    title: track.title,
    artist: track.artist,
    url: track.url,
    duration,
    durationSeconds,
    addedAt: track.addedAt,
  };
};

const serializePlaylist = (playlist) => {
  const tracks = (playlist.tracks || []).map(serializeTrack);

  return {
    _id: playlist._id,
    id: playlist._id,
    name: playlist.name,
    description: playlist.description,
    tracks,
    songs: tracks,
    trackIds: tracks.map((track) => track.trackId),
    trackCount: tracks.length,
    gradient: playlist.gradient,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  };
};

/**
 * Get all playlists for the authenticated user
 */
export const getUserPlaylists = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const userId = req.id;
    const playlists = await Playlist.find({ userId })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.status(200).json({
      success: true,
      playlists: playlists.map(serializePlaylist),
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch playlists",
    });
  }
};

/**
 * Create a new playlist
 */
export const createPlaylist = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const { name, description, gradient } = req.body;
    const userId = req.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Playlist name is required",
      });
    }

    const playlist = new Playlist({
      name: name.trim(),
      description: description?.trim() || "",
      userId,
      gradient: gradient || "from-indigo-700 via-purple-700 to-slate-900",
      tracks: [],
    });

    await playlist.save();

    return res.status(201).json({
      success: true,
      playlist: serializePlaylist(playlist),
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create playlist",
    });
  }
};

/**
 * Get a specific playlist with full track details
 */
export const getPlaylist = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const { id } = req.params;
    const userId = req.id;

    const playlist = await Playlist.findOne({ _id: id, userId });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    return res.status(200).json({
      success: true,
      playlist: serializePlaylist(playlist),
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch playlist",
    });
  }
};

/**
 * Update playlist metadata (name, description, gradient)
 */
export const updatePlaylist = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const { id } = req.params;
    const { name, description, gradient } = req.body;
    const userId = req.id;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (gradient !== undefined) updateData.gradient = gradient;

    const playlist = await Playlist.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { returnDocument: "after" }
    );

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    return res.status(200).json({
      success: true,
      playlist: serializePlaylist(playlist),
    });
  } catch (error) {
    console.error("Error updating playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update playlist",
    });
  }
};

/**
 * Delete a playlist
 */
export const deletePlaylist = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const { id } = req.params;
    const userId = req.id;

    const playlist = await Playlist.findOneAndDelete({ _id: id, userId });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete playlist",
    });
  }
};

/**
 * Add a track to a playlist
 */
export const addTrackToPlaylist = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const { id } = req.params;
    const { trackId, title, artist, url, duration, durationSeconds } = req.body;
    const userId = req.id;

    if (!trackId || !title || !artist || !url) {
      return res.status(400).json({
        success: false,
        message: "Track details are required",
      });
    }

    const catalogTrack = trackById(trackId);

    // Check if track already exists in playlist
    const playlist = await Playlist.findOne({ _id: id, userId });
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const trackExists = playlist.tracks.some(track => track.trackId === trackId);
    if (trackExists) {
      return res.status(400).json({
        success: false,
        message: "Track already exists in playlist",
      });
    }

    playlist.tracks.push({
      trackId,
      title,
      artist,
      url,
      duration: duration ?? catalogTrack?.duration ?? "",
      durationSeconds:
        parseTrackDurationSeconds(durationSeconds) ??
        parseTrackDurationSeconds(duration) ??
        parseTrackDurationSeconds(catalogTrack?.duration),
      addedAt: new Date(),
    });

    await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Track added to playlist",
      playlist: serializePlaylist(playlist),
      trackCount: playlist.tracks.length,
    });
  } catch (error) {
    console.error("Error adding track to playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add track to playlist",
    });
  }
};

/**
 * Remove a track from a playlist
 */
export const removeTrackFromPlaylist = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
    }

    const { id, trackId } = req.params;
    const userId = req.id;

    const playlist = await Playlist.findOne({ _id: id, userId });
    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
    }

    const trackIndex = playlist.tracks.findIndex(track => track.trackId === trackId);
    if (trackIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Track not found in playlist",
      });
    }

    playlist.tracks.splice(trackIndex, 1);
    await playlist.save();

    return res.status(200).json({
      success: true,
      message: "Track removed from playlist",
      trackCount: playlist.tracks.length,
    });
  } catch (error) {
    console.error("Error removing track from playlist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove track from playlist",
    });
  }
};
