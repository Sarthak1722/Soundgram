import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoChatbubbleOutline,
  IoClose,
  IoEllipsisHorizontal,
  IoHeart,
  IoHeartOutline,
  IoPencil,
  IoTrashOutline,
} from "react-icons/io5";
import {
  addCommentToPost,
  deletePost,
  toggleLikeOnPost,
  updatePostCaption,
} from "../../api/postsApi.js";

const formatPostDate = (dateString) =>
  new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const PostCard = ({
  post,
  onUpdate,
  canManage = false,
  onDelete,
  className = "",
  mediaClassName = "",
}) => {
  const [commentDraft, setCommentDraft] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption || "");
  const [savingCaption, setSavingCaption] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setCaptionDraft(post.caption || "");
  }, [post.caption, post._id]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const visibleComments = useMemo(() => {
    if (showComments) return post.comments || [];
    return (post.comments || []).slice(-2);
  }, [post.comments, showComments]);

  const resolvedMediaClassName = mediaClassName || "max-h-[42rem]";

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const updated = await toggleLikeOnPost(post._id);
      onUpdate(updated);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update like.");
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text || commenting) return;

    setCommenting(true);
    try {
      const updated = await addCommentToPost(post._id, text);
      onUpdate(updated);
      setCommentDraft("");
      setShowComments(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add comment.");
    } finally {
      setCommenting(false);
    }
  };

  const handleSaveCaption = async () => {
    if (savingCaption) return;

    try {
      setSavingCaption(true);
      const updated = await updatePostCaption(post._id, captionDraft);
      onUpdate(updated);
      setEditingCaption(false);
      toast.success("Caption updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update caption.");
    } finally {
      setSavingCaption(false);
    }
  };

  const handleDeletePost = async () => {
    if (deleting) return;

    try {
      setDeleting(true);
      await deletePost(post._id);
      onDelete?.(post._id);
      toast.success("Post deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete post.");
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  return (
    <article
      className={`overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f10] shadow-[0_12px_34px_rgba(0,0,0,0.22)] ${className}`}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <Link
          to={`/homepage/profile/${post.author._id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <img
            src={post.author.profilePhoto}
            alt={post.author.userName}
            className="h-11 w-11 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">@{post.author.userName}</p>
            <p className="truncate text-xs text-zinc-500">{formatPostDate(post.createdAt)}</p>
          </div>
        </Link>
        {canManage ? (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="rounded-full p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Post options"
            >
              <IoEllipsisHorizontal className="text-lg" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-white/10 bg-[#151515]/95 p-1.5 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditingCaption(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/[0.06]"
                >
                  <IoPencil className="text-base text-zinc-400" />
                  Edit caption
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeletePost()}
                  disabled={deleting}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  <IoTrashOutline className="text-base" />
                  {deleting ? "Deleting..." : "Delete post"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="bg-black">
        {post.mediaType === "video" ? (
          <video
            src={post.mediaUrl}
            controls
            className={`${resolvedMediaClassName} w-full bg-black object-cover`}
          />
        ) : (
          <img
            src={post.mediaUrl}
            alt={post.caption || "Post"}
            className={`${resolvedMediaClassName} w-full object-cover`}
          />
        )}
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-2 text-sm text-white transition disabled:opacity-50"
          >
            {post.viewerHasLiked ? <IoHeart className="text-xl text-red-500" /> : <IoHeartOutline className="text-xl" />}
            {post.likeCount}
          </button>
          <button
            type="button"
            onClick={() => setShowComments((current) => !current)}
            className="flex items-center gap-2 text-sm text-white"
          >
            <IoChatbubbleOutline className="text-xl" />
            {post.commentCount}
          </button>
        </div>

        {post.caption ? <p className="text-sm leading-6 text-zinc-200">{post.caption}</p> : null}

        {(post.comments || []).length ? (
          <div className="space-y-2">
            {visibleComments.map((comment) => (
              <div key={comment._id} className="text-sm leading-6 text-zinc-300">
                <Link to={`/homepage/profile/${comment.author._id}`} className="mr-2 font-semibold text-white">
                  @{comment.author.userName}
                </Link>
                <span>{comment.text}</span>
              </div>
            ))}
            {(post.comments || []).length > 2 ? (
              <button
                type="button"
                onClick={() => setShowComments((current) => !current)}
                className="text-xs font-medium text-zinc-500 transition hover:text-white"
              >
                {showComments ? "Hide comments" : `View all ${post.commentCount} comments`}
              </button>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleComment} className="flex items-center gap-3 border-t border-white/10 pt-3">
          <input
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={commenting || !commentDraft.trim()}
            className="text-sm font-semibold text-white transition disabled:text-zinc-600"
          >
            Post
          </button>
        </form>
      </div>

      {canManage && editingCaption ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#101011] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">Edit caption</p>
                <p className="mt-1 text-sm text-zinc-500">Keep it clean and concise.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCaption(false)}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close caption editor"
              >
                <IoClose className="text-lg" />
              </button>
            </div>

            <textarea
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              rows={5}
              maxLength={2200}
              placeholder="Write a caption..."
              className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-[#171718] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500"
            />

            <div className="mt-2 text-right text-xs text-zinc-500">{captionDraft.length}/2200</div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingCaption(false)}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveCaption()}
                disabled={savingCaption}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {savingCaption ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
};

export default PostCard;
