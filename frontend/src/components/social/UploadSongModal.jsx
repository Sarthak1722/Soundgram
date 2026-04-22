import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IoCloudUploadOutline, IoClose } from "react-icons/io5";
import { uploadPlaybackTrack } from "../../api/playbackApi.js";

const UploadSongModal = ({ open, onClose, onTrackUploaded }) => {
  const [songFile, setSongFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!open) {
      setSongFile(null);
      setUploadTitle("");
      setUploadArtist("");
      setUploadAlbum("");
      setUploading(false);
      setDragActive(false);
    }
  }, [open]);

  const fileLabel = useMemo(() => {
    if (!songFile) return "Drop an MP3 here or click to browse";
    return songFile.name;
  }, [songFile]);

  if (!open) return null;

  const pickFile = (file) => {
    if (!file) return;

    const isMp3 =
      file.type === "audio/mpeg" || String(file.name || "").toLowerCase().endsWith(".mp3");

    if (!isMp3) {
      toast.error("Only MP3 files are supported.");
      return;
    }

    setSongFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    pickFile(event.dataTransfer.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!songFile) {
      toast.error("Choose an MP3 file first.");
      return;
    }

    setUploading(true);
    try {
      const uploadedTrack = await uploadPlaybackTrack({
        songFile,
        title: uploadTitle,
        artist: uploadArtist,
        album: uploadAlbum,
      });

      onTrackUploaded(uploadedTrack);
      onClose();
      toast.success("Song added to available songs.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload song.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_24px_90px_rgba(0,0,0,0.52)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Add audio</p>
            <p className="text-xs text-zinc-500">Upload one MP3 into the shared songs library</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close upload song dialog"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed px-5 py-8 text-center transition ${
              dragActive
                ? "border-emerald-400/60 bg-emerald-500/10"
                : "border-white/12 bg-black/15 hover:border-white/20 hover:bg-white/[0.03]"
            }`}
          >
            <IoCloudUploadOutline className="text-4xl text-zinc-500" />
            <p className="mt-4 text-base font-medium text-white">{fileLabel}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Add a local MP3 and it will appear in Available Songs for everyone.
            </p>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              className="hidden"
              onChange={(event) => pickFile(event.target.files?.[0] || null)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
              placeholder="Song title (optional)"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
            />
            <input
              value={uploadArtist}
              onChange={(event) => setUploadArtist(event.target.value)}
              placeholder="Artist (optional)"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
            />
            <input
              value={uploadAlbum}
              onChange={(event) => setUploadAlbum(event.target.value)}
              placeholder="Album (optional)"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Add to available songs"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadSongModal;
