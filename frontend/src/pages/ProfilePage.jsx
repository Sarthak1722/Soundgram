import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  IoAddOutline,
  IoChatbubbleEllipsesOutline,
  IoClose,
  IoEllipsisHorizontal,
  IoGridOutline,
  IoLogOutOutline,
} from "react-icons/io5";
import { clearSelectedRoomChat, resetRooms } from "../redux/roomsSlice.js";
import { setAuthStatus, setauthUser, setotherUsers, setselectedUser } from "../redux/userSlice.js";
import { addFriend, fetchUserProfile, removeFriend } from "../api/userApi.js";
import { fetchMyPosts, fetchUserPosts } from "../api/postsApi.js";
import { isFriendWithUser } from "../utils/socialGraph.js";
import FriendsModal from "../components/social/FriendsModal.jsx";
import CreatePostModal from "../components/social/CreatePostModal.jsx";
import PostCard from "../components/social/PostCard.jsx";
import { resetThread } from "../redux/messageSlice.js";
import { resetPlayback } from "../redux/playbackSlice.js";
import apiClient from "../api/client.js";

const ProfilePage = () => {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { authUser } = useSelector((store) => store.user);

  const isOwnProfile = !userId || String(userId) === String(authUser?._id);
  const [profileUser, setProfileUser] = useState(authUser);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [pendingFriendId, setPendingFriendId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (isOwnProfile) {
      setProfileUser(authUser);
    }
  }, [authUser, isOwnProfile]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const [nextProfile, nextPosts] = await Promise.all([
          isOwnProfile ? Promise.resolve(authUser) : fetchUserProfile(userId),
          isOwnProfile ? fetchMyPosts() : fetchUserPosts(userId),
        ]);

        if (cancelled) return;

        setProfileUser(nextProfile);
        setPosts(nextPosts);
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load this profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (authUser?._id) {
      void loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [authUser, isOwnProfile, userId]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [mobileMenuOpen]);

  const openConversation = () => {
    if (!profileUser?._id || isOwnProfile) return;
    dispatch(clearSelectedRoomChat());
    dispatch(setselectedUser(profileUser));
    navigate("/homepage/messages");
  };

  const handleLogout = async () => {
    try {
      const res = await apiClient.get("/api/v1/user/logout");
      toast.success(res.data?.message || "Logged out.");
      dispatch(setauthUser(null));
      dispatch(setAuthStatus("unauthenticated"));
      dispatch(setselectedUser(null));
      dispatch(setotherUsers([]));
      dispatch(resetThread());
      dispatch(resetPlayback());
      dispatch(resetRooms());
      navigate("/");
    } catch (error) {
      console.error("logout failed", error);
      toast.error("Logout failed");
    }
  };

  const handleAddFriend = async () => {
    if (!profileUser?._id) return;
    setPendingFriendId(String(profileUser._id));
    try {
      const nextAuthUser = await addFriend(profileUser._id);
      dispatch(setauthUser(nextAuthUser));
      setProfileUser((current) =>
        current
          ? {
              ...current,
              isFriend: true,
            }
          : current,
      );
      toast.success(`You and @${profileUser.userName} are now connected.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add friend.");
    } finally {
      setPendingFriendId(null);
    }
  };

  const handleRemoveFriend = async (user = profileUser) => {
    if (!user?._id) return;
    setPendingFriendId(String(user._id));
    try {
      const nextAuthUser = await removeFriend(user._id);
      dispatch(setauthUser(nextAuthUser));

      if (isOwnProfile) {
        const nextFriends = (profileUser?.friends || []).filter((friend) => String(friend._id) !== String(user._id));
        setProfileUser((current) =>
          current
            ? {
                ...current,
                friends: nextFriends,
                friendCount: nextFriends.length,
              }
            : current,
        );
      } else if (String(user._id) === String(profileUser?._id)) {
        setProfileUser((current) =>
          current
            ? {
                ...current,
                isFriend: false,
              }
            : current,
        );
      }

      toast.success(`Removed @${user.userName} from friends.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove friend.");
    } finally {
      setPendingFriendId(null);
    }
  };

  const openProfileFromFriends = (friend) => {
    setFriendsOpen(false);
    navigate(`/homepage/profile/${friend._id}`);
  };

  const upsertPost = (updatedPost) => {
    setPosts((current) => current.map((post) => (post._id === updatedPost._id ? updatedPost : post)));
    setSelectedPost((current) => (current?._id === updatedPost._id ? updatedPost : current));
  };

  const removePostFromState = (postId) => {
    setPosts((current) => current.filter((post) => post._id !== postId));
    setSelectedPost((current) => (current?._id === postId ? null : current));
  };

  const canMessage = !isOwnProfile && isFriendWithUser(authUser, profileUser?._id);
  const profileFriends = useMemo(() => profileUser?.friends || [], [profileUser?.friends]);
  const statCardClass =
    "rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center transition hover:bg-white/[0.05]";

  const renderProfileActions = (layout = "desktop") => {
    const isMobile = layout === "mobile";
    const baseButtonClass = isMobile
      ? "flex-1 justify-center px-4 py-3"
      : "px-4 py-2.5";

    if (isOwnProfile) {
      return (
        <button
          type="button"
          onClick={() => setCreatePostOpen(true)}
          className={`inline-flex items-center gap-2 rounded-full bg-white text-sm font-semibold text-black transition hover:bg-zinc-100 ${baseButtonClass}`}
        >
          <IoAddOutline />
          Add post
        </button>
      );
    }

    if (canMessage) {
      return (
        <>
          <button
            type="button"
            onClick={openConversation}
            className={`inline-flex items-center gap-2 rounded-full bg-white text-sm font-semibold text-black transition hover:bg-zinc-100 ${baseButtonClass}`}
          >
            <IoChatbubbleEllipsesOutline />
            Message
          </button>
          <button
            type="button"
            onClick={() => handleRemoveFriend(profileUser)}
            disabled={pendingFriendId === String(profileUser._id)}
            className={`rounded-full border border-white/10 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-50 ${baseButtonClass}`}
          >
            Unfriend
          </button>
        </>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAddFriend}
        disabled={pendingFriendId === String(profileUser._id)}
        className={`rounded-full bg-white text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50 ${baseButtonClass}`}
      >
        Add friend
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-[#09090a]">
      <div className="w-full max-w-5xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-14 text-center text-sm text-zinc-500">
            Loading profile...
          </div>
        ) : !profileUser?._id ? (
          <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-14 text-center text-sm text-zinc-500">
            Profile not found.
          </div>
        ) : (
          <>
            <section className="border-b border-white/10 pb-8">
              <div className="md:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-white">@{profileUser.userName}</h1>
                    <p className="mt-1 text-sm text-zinc-500">{profileUser.fullName}</p>
                  </div>

                  {isOwnProfile ? (
                    <div className="relative shrink-0" ref={mobileMenuRef}>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen((current) => !current)}
                        className="rounded-full border border-white/10 bg-white/[0.03] p-2.5 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Profile options"
                      >
                        <IoEllipsisHorizontal className="text-lg" />
                      </button>
                      {mobileMenuOpen ? (
                        <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border border-white/10 bg-[#121212]/95 p-1.5 shadow-2xl backdrop-blur">
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              void handleLogout();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                          >
                            <IoLogOutOutline className="text-base" />
                            Log out
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <img
                    src={profileUser.profilePhoto}
                    alt={profileUser.userName}
                    className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />

                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                    <div className={statCardClass}>
                      <p className="text-xl font-semibold text-white">{posts.length}</p>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                        Posts
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFriendsOpen(true)}
                      className={statCardClass}
                    >
                      <p className="text-xl font-semibold text-white">{profileUser.friendCount || 0}</p>
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                        Friends
                      </p>
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">{renderProfileActions("mobile")}</div>
              </div>

              <div className="hidden md:flex md:flex-row md:items-start md:gap-10">
                <img
                  src={profileUser.profilePhoto}
                  alt={profileUser.userName}
                  className="h-36 w-36 rounded-full object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight text-white">
                        @{profileUser.userName}
                      </h1>
                      <p className="mt-1 text-sm text-zinc-500">{profileUser.fullName}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">{renderProfileActions("desktop")}</div>
                  </div>

                  <div className="mt-6 flex items-center gap-8">
                    <div>
                      <p className="text-lg font-semibold text-white">{posts.length}</p>
                      <p className="text-sm text-zinc-500">posts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFriendsOpen(true)}
                      className="text-left transition hover:opacity-80"
                    >
                      <p className="text-lg font-semibold text-white">{profileUser.friendCount || 0}</p>
                      <p className="text-sm text-zinc-500">friends</p>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-6">
              <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
                <IoGridOutline />
                Posts
              </div>

              {posts.length ? (
                <div className="grid grid-cols-3 gap-1.5 md:gap-3">
                  {posts.map((post) => (
                    <button
                      key={post._id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square overflow-hidden bg-black"
                    >
                      {post.mediaType === "video" ? (
                        <video
                          src={post.mediaUrl}
                          muted
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <img
                          src={post.mediaUrl}
                          alt={post.caption || "Post"}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/12" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-16 text-center">
                  <p className="text-base font-medium text-white">
                    {isOwnProfile ? "No posts yet" : "No posts yet"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {isOwnProfile
                      ? "Start your profile with a first post."
                      : "This user has not posted anything yet."}
                  </p>
                  {isOwnProfile ? (
                    <button
                      type="button"
                      onClick={() => setCreatePostOpen(true)}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100"
                    >
                      <IoAddOutline />
                      Add post
                    </button>
                  ) : null}
                </div>
              )}
            </section>

            <FriendsModal
              open={friendsOpen}
              title={`Friends of @${profileUser.userName}`}
              friends={profileFriends}
              isOwnProfile={isOwnProfile}
              pendingFriendId={pendingFriendId}
              onClose={() => setFriendsOpen(false)}
              onOpenProfile={openProfileFromFriends}
              onUnfriend={handleRemoveFriend}
            />

            <CreatePostModal
              open={createPostOpen}
              onClose={() => setCreatePostOpen(false)}
              onPostCreated={(post) => setPosts((current) => [post, ...current])}
            />

            {selectedPost ? (
              <div className="fixed inset-0 z-50 bg-black/82 p-3 backdrop-blur-sm sm:p-4">
                <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center">
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(null)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#111111]/92 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/10"
                      aria-label="Close post preview"
                    >
                      <IoClose className="text-lg" />
                    </button>
                  </div>
                  <div className="min-h-0 overflow-y-auto rounded-[30px]">
                  <PostCard
                    post={selectedPost}
                    onUpdate={upsertPost}
                    canManage={isOwnProfile}
                    onDelete={removePostFromState}
                    className="mx-auto w-full max-w-2xl"
                    mediaClassName="max-h-[34vh] sm:max-h-[46vh] md:max-h-[52vh] lg:max-h-[60vh]"
                  />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
