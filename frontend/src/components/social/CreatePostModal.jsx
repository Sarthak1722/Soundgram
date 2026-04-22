import { useEffect, useMemo, useState } from "react";
import { IoCloudUploadOutline, IoClose } from "react-icons/io5";
import toast from "react-hot-toast";
import { createProfilePost } from "../../api/postsApi.js";

const CreatePostModal = ({ open, onClose, onPostCreated }) => {
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!mediaFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(mediaFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaFile]);

  useEffect(() => {
    if (!open) {
      setCaption("");
      setMediaFile(null);
    }
  }, [open]);

  const mediaPreviewType = useMemo(() => {
    if (!mediaFile?.type) return "";
    return mediaFile.type.startsWith("video/") ? "video" : "image";
  }, [mediaFile]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!mediaFile) {
      toast.error("Choose a photo or video first.");
      return;
    }

    setPosting(true);
    try {
      const post = await createProfilePost({ caption: caption.trim(), mediaFile });
      onPostCreated(post);
      onClose();
      toast.success("Post shared.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create the post.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_24px_90px_rgba(0,0,0,0.52)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Create post</p>
            <p className="text-xs text-zinc-500">Upload a photo or video</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close create post dialog"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-white/12 bg-black/15 px-5 py-8 text-center transition hover:border-white/20 hover:bg-white/[0.03]">
              <IoCloudUploadOutline className="text-4xl text-zinc-500" />
              <p className="mt-4 text-base font-medium text-white">
                {mediaFile ? mediaFile.name : "Choose an image or video"}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Cloudinary will store the media and MongoDB will keep the post metadata.
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
              />
            </label>

            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write a caption..."
              rows={5}
              className="w-full rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/20 focus:outline-none"
            />

            <button
              type="submit"
              disabled={posting}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
            >
              {posting ? "Posting..." : "Share post"}
            </button>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
            {previewUrl ? (
              mediaPreviewType === "video" ? (
                <video
                  src={previewUrl}
                  controls
                  className="aspect-square w-full rounded-[22px] bg-black object-cover"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Post preview"
                  className="aspect-square w-full rounded-[22px] object-cover"
                />
              )
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-black/10 text-center text-sm leading-6 text-zinc-500">
                Pick a file to preview the post.
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
