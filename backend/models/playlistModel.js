import mongoose from "mongoose";

const playlistModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tracks: [
      {
        trackId: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        artist: {
          type: String,
          required: true,
        },
        album: {
          type: String,
          default: "",
        },
        url: {
          type: String,
          required: true,
        },
        duration: {
          type: String,
          default: "",
        },
        durationSeconds: {
          type: Number,
          default: null,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    gradient: {
      type: String,
      default: "from-indigo-700 via-purple-700 to-slate-900",
    },
  },
  { timestamps: true },
);

playlistModel.index({ userId: 1, createdAt: -1 });

export const Playlist = mongoose.model("Playlist", playlistModel);
