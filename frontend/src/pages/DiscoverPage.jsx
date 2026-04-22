import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { IoCameraOutline, IoNotificationsOutline } from "react-icons/io5";
import { fetchFeedPosts } from "../api/postsApi.js";
import PostCard from "../components/social/PostCard.jsx";

const greetingByHour = (hour) => {
  if (hour > 0 && hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const getFirstName = (fullName = "") => {
  const [first = ""] = fullName.trim().split(/\s+/);
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
};

const DiscoverPage = () => {
  const navigate = useNavigate();
  const authUser = useSelector((store) => store.user.authUser);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCompactMobile, setIsCompactMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < 390,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsCompactMobile(window.innerWidth < 390);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFeed = async () => {
      try {
        setLoading(true);
        const nextPosts = await fetchFeedPosts();
        if (!cancelled) {
          setPosts(nextPosts);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load the feed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadFeed();

    return () => {
      cancelled = true;
    };
  }, []);

  const updatePost = (updatedPost) => {
    setPosts((current) =>
      current.map((post) => (post._id === updatedPost._id ? updatedPost : post)),
    );
  };

  const firstName = getFirstName(authUser?.fullName);
  const greeting = greetingByHour(new Date().getHours());

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-[#09090a]">
      <div className="w-full max-w-[680px] px-4 py-6 sm:px-6">
        <header className="mb-6 border-b border-white/10 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-400/90">
            Home
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {firstName ? `${greeting}, ${firstName}` : greeting}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">A clean feed of posts from everyone.</p>
            </div>
            <div className="flex items-center gap-2">
              {isCompactMobile ? (
                <button
                  type="button"
                  onClick={() => navigate("/homepage/notifications")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Open alerts"
                >
                  <IoNotificationsOutline className="text-xl" />
                </button>
              ) : null}
              <Link
                to="/homepage/profile"
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
              >
                <img
                  src={authUser?.profilePhoto}
                  alt={authUser?.userName}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <span className="hidden text-sm font-medium text-white sm:inline">
                  @{authUser?.userName}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-14 text-center text-sm text-zinc-500">
            Loading posts...
          </div>
        ) : posts.length ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={updatePost} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-16 text-center">
            <IoCameraOutline className="mx-auto text-4xl text-zinc-600" />
            <p className="mt-4 text-lg font-medium text-white">No posts yet</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Once people start posting, this page will stay focused on the feed only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
