import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  IoArrowForward,
  IoChatbubbles,
  IoHeadset,
  IoLogOutOutline,
  IoMusicalNotes,
  IoPeople,
  IoPlay,
  IoPlayForward,
  IoRadio,
  IoReturnUpForward,
  IoSparkles,
  IoTrendingUp,
} from "react-icons/io5";
import { fetchUserPlaylists } from "../api/playlistsApi.js";
import { fetchPlaybackTracks } from "../api/playbackApi.js";
import { listRooms } from "../api/roomsApi.js";
import { resetRooms, setRoomsList } from "../redux/roomsSlice.js";
import { resetThread } from "../redux/messageSlice.js";
import { resetPlayback } from "../redux/playbackSlice.js";
import { setAuthStatus, setauthUser, setotherUsers, setselectedUser } from "../redux/userSlice.js";
import useGetOtherUsers from "../hooks/useGetOtherUsers.jsx";
import apiClient from "../api/client.js";
import { readHomeContinuity } from "../utils/homeContinuity.js";

const gradients = [
  "from-emerald-500/30 via-emerald-700/15 to-transparent",
  "from-cyan-500/25 via-sky-700/15 to-transparent",
  "from-orange-500/25 via-rose-700/15 to-transparent",
  "from-violet-500/25 via-indigo-700/15 to-transparent",
];

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
  useGetOtherUsers();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { authUser, otherUsers, onlineUsers } = useSelector((store) => store.user);
  const { activeJam, list: roomList } = useSelector((store) => store.rooms);

  const [playlists, setPlaylists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continuity, setContinuity] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [playlistData, trackData, roomsData] = await Promise.all([
          fetchUserPlaylists(),
          fetchPlaybackTracks(),
          listRooms(),
        ]);

        if (cancelled) return;

        setPlaylists(playlistData);
        setTracks(trackData);
        dispatch(setRoomsList(roomsData));
      } catch (error) {
        console.error("Failed to load home data", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    setContinuity(readHomeContinuity(authUser?._id));
  }, [authUser?._id, activeJam, playlists.length, tracks.length]);

  const now = new Date();
  const greeting = greetingByHour(now.getHours());
  const firstName = getFirstName(authUser?.fullName);
  const onlineIds = Array.isArray(onlineUsers) ? onlineUsers.map(String) : [];
  const onlineFriends = (otherUsers || []).filter((user) => onlineIds.includes(String(user._id)));
  const topPlaylist = [...playlists].sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0))[0] || null;
  const latestTracks = tracks.slice(0, 4);
  const rooms = roomList || [];

  const liveContext = `${now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })} · based on your real library and social activity`;

  const heroStats = [
    `${playlists.length} playlists built`,
    `${tracks.length} tracks ready`,
    activeJam ? `Active jam: ${activeJam.label}` : `${rooms.length} jam rooms available`,
  ];

  const continuityItems = [
    continuity?.lastJam
      ? {
          id: "recent-jam",
          title: `Last jam: ${continuity.lastJam.label}`,
          meta: continuity.lastJam.kind === "group" ? "Group session" : "Direct-message session",
          action: "Open rooms",
          to: "/homepage/rooms",
          Icon: IoRadio,
        }
      : null,
    continuity?.lastTrack
      ? {
          id: "recent-track",
          title: continuity.lastTrack.title,
          meta: continuity.lastTrack.artist || "Recently played track",
          action: "Browse tracks",
          to: "/homepage/liked",
          Icon: IoPlayForward,
        }
      : null,
    continuity?.lastPath && continuity.lastPath !== "/homepage/home"
      ? {
          id: "recent-route",
          title: `Last open: ${continuity.lastPathLabel || "App"}`,
          meta: "Return to where you left off",
          action: "Resume",
          to: continuity.lastPath,
          Icon: IoReturnUpForward,
        }
      : null,
  ].filter(Boolean);

  const pulseCards = [
    {
      id: "pulse-online",
      title: onlineFriends.length
        ? `${onlineFriends.length} friend${onlineFriends.length === 1 ? "" : "s"} online now`
        : "No friends online right now",
      meta: onlineFriends.length
        ? `Start a DM jam with ${onlineFriends[0]?.fullName || "someone"}`
        : "Invite people in Messages when they show up",
      to: "/homepage/messages",
    },
    {
      id: "pulse-rooms",
      title: rooms.length
        ? `${rooms.length} jam room${rooms.length === 1 ? "" : "s"} ready to join`
        : "No jam rooms yet",
      meta: rooms.length ? "Open rooms and jump back in" : "Create your first shared room",
      to: "/homepage/rooms",
    },
    {
      id: "pulse-library",
      title: topPlaylist
        ? `"${topPlaylist.name}" is your biggest playlist`
        : "Your playlist shelf is still empty",
      meta: topPlaylist
        ? `${topPlaylist.trackCount || 0} tracks saved there`
        : "Create one mix and the home feed will get smarter",
      to: "/homepage/playlists",
    },
  ];

  const insightCards = [
    {
      id: "insight-social",
      meta: "Social signal",
      title: onlineFriends.length ? "Your circle is active enough to start a session." : "Your home feed is quiet right now.",
      body: onlineFriends.length
        ? `${onlineFriends
            .slice(0, 3)
            .map((user) => getFirstName(user.fullName))
            .join(", ")} ${onlineFriends.length > 1 ? "are" : "is"} online, which makes this a good time to open Messages and start a jam.`
        : "Once friends come online, this section can highlight who is around and who is ready for a group listen.",
    },
    {
      id: "insight-library",
      meta: "Library signal",
      title: topPlaylist ? "Your library already has a clear center of gravity." : "Your library needs a first anchor playlist.",
      body: topPlaylist
        ? `${topPlaylist.name} leads your library, so it should be easier to relaunch it, branch from it, or turn it into a room starter.`
        : "A stronger home feed starts once you create or save more mixes. Right now the app has little personal taste data to work with.",
    },
    {
      id: "insight-jam",
      meta: "Jam signal",
      title: activeJam ? "You already have a live listening context." : "There is room for a stronger jump-back-in moment.",
      body: activeJam
        ? `You are currently pointed at ${activeJam.kind === "group" ? "group" : "DM"} jam "${activeJam.label}", so quick controls and continuity matter most.`
        : rooms.length
          ? "Your rooms exist, but the home page should make rejoining one feel immediate instead of making you navigate around."
          : "Once you create a room, this area can become a real-time launchpad instead of just a static welcome section.",
    },
  ];

  const actionCards = [
    {
      id: "action-1",
      kicker: activeJam ? "Currently live" : "Start listening",
      eyebrow: activeJam ? "Resume playback" : "Library shortcut",
      title: activeJam ? `Resume ${activeJam.label}` : topPlaylist ? `Play ${topPlaylist.name}` : "Open your track shelf",
      body: activeJam
        ? "You already have a synced context selected, so the fastest path is getting straight back into playback."
        : topPlaylist
          ? "Your biggest playlist is the most natural starting point for a session."
          : "You have tracks available already, even if your playlists are still growing.",
      action: activeJam ? "Go to rooms" : topPlaylist ? "Open playlists" : "Browse tracks",
      to: activeJam ? "/homepage/rooms" : topPlaylist ? "/homepage/playlists" : "/homepage/liked",
      tone: "from-emerald-500/18 via-emerald-700/10 to-transparent",
      icon: IoPlay,
    },
    {
      id: "action-2",
      kicker: onlineFriends.length ? "Friends online" : "Social layer",
      eyebrow: onlineFriends.length ? "Realtime invite" : "Messages shortcut",
      title: onlineFriends.length ? "Start a DM jam now" : "Warm up your messages tab",
      body: onlineFriends.length
        ? `${getFirstName(onlineFriends[0]?.fullName)} is already around. A one-tap shared session would feel especially strong here.`
        : "Your realtime chat stack is good; the next level is making it easier to turn any conversation into a signature listening moment.",
      action: "Open messages",
      to: "/homepage/messages",
      tone: "from-sky-500/18 via-indigo-700/10 to-transparent",
      icon: IoChatbubbles,
    },
    {
      id: "action-3",
      kicker: rooms.length ? "Group energy" : "Build a room",
      eyebrow: rooms.length ? "Jump back in" : "Shared listening",
      title: rooms.length ? "Your rooms are ready to be reused" : "Create a room for shared playback",
      body: rooms.length
        ? "Rooms are one of the most creative parts of this app. The home feed should surface them as living spaces, not hidden utilities."
        : "Jam rooms are a standout feature, and making one is the quickest path to a more memorable experience.",
      action: rooms.length ? "See rooms" : "Create room",
      to: "/homepage/rooms",
      tone: "from-orange-500/18 via-rose-700/10 to-transparent",
      icon: IoPeople,
    },
  ];

  const quickMixes = playlists.slice(0, 3);

  const logoutHandler = async () => {
    try {
      const res = await apiClient.get("/api/v1/user/logout");
      toast.success(res.data?.message);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0a0a]/80 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-400/90">
          Home
        </p>
        <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-white sm:text-3xl">
          {firstName ? `${greeting}, ${firstName}` : greeting}. Ready to pick the next session?
        </h1>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          This feed now reflects your real playlists, tracks, rooms, and online people instead of only static editorial cards.
        </p>
        <p className="mt-2 hidden text-xs uppercase tracking-[0.22em] text-zinc-500 sm:block">{liveContext}</p>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-8">
        <section className="mb-6 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(16,25,22,0.96),rgba(8,8,10,0.92))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:mb-8 sm:rounded-[28px] sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300">
                <IoSparkles className="text-emerald-400" />
                Live account snapshot
              </div>
              <h2 className="mt-4 max-w-lg text-[1.9rem] font-semibold leading-tight text-white sm:text-4xl">
                {activeJam
                  ? `Your next tap should probably bring ${activeJam.label} back to life.`
                  : topPlaylist
                    ? `${topPlaylist.name} looks like the strongest place to restart from.`
                    : "Your account is ready for its first real listening identity."}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
                {loading
                  ? "Pulling your rooms, library, and activity into one place."
                  : "The home feed should help you continue something real: a conversation, a room, a playlist, or a listening session."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-300">
                {heroStats.map((stat) => (
                  <span
                    key={stat}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5"
                  >
                    {stat}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link
                  to={topPlaylist ? "/homepage/playlists" : "/homepage/liked"}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100"
                >
                  {topPlaylist ? "Open playlists" : "Browse tracks"}
                  <IoArrowForward />
                </Link>
                <Link
                  to={onlineFriends.length ? "/homepage/messages" : "/homepage/rooms"}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
                >
                  {onlineFriends.length ? "Start a conversation" : "Open jam rooms"}
                  {onlineFriends.length ? <IoChatbubbles /> : <IoPeople />}
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {pulseCards.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.7)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Pulse
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{item.meta}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:gap-4 lg:grid-cols-3">
          {insightCards.map((card) => (
            <article
              key={card.id}
              className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                {card.meta}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{card.body}</p>
            </article>
          ))}
        </section>

        {continuityItems.length ? (
          <section className="mb-8 sm:mb-10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Recent Activity
              </h2>
              <span className="text-xs font-medium text-zinc-500">
                Resume from where you were last active
              </span>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
              {continuityItems.map((item) => {
                const ContinuityIcon = item.Icon;

                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="group rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">{item.meta}</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200">
                        <ContinuityIcon className="text-lg" />
                      </span>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                      {item.action}
                      <IoArrowForward />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mb-8 sm:mb-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Continue From Here
            </h2>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
              <IoTrendingUp className="text-emerald-400" />
              Smart shortcuts based on current account state
            </span>
          </div>

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            {actionCards.map((card, index) => {
              const CardIcon = card.icon;

              return (
              <Link
                key={card.id}
                to={card.to}
                className="group relative flex min-h-[200px] flex-col overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,20,0.96),rgba(10,10,12,0.98))] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:min-h-[220px] sm:rounded-[24px] sm:p-5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.tone}`} />
                <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${gradients[index % gradients.length]} blur-2xl opacity-80 transition group-hover:opacity-100`} />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-200">
                      {card.kicker}
                    </span>
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                      {card.eyebrow}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-200">
                    <CardIcon className="text-lg" />
                  </span>
                </div>

                <div className="relative mt-6 flex flex-1 flex-col sm:mt-8">
                  <h3 className="max-w-[16rem] text-[1.55rem] font-semibold leading-tight text-white sm:text-[1.85rem]">
                    {card.title}
                  </h3>
                  <p className="mt-4 max-w-[18rem] text-sm leading-6 text-zinc-300">{card.body}</p>
                </div>

                <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Open next
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-emerald-200 transition group-hover:bg-white/[0.08]">
                    {card.action}
                    <IoArrowForward />
                  </span>
                </div>
              </Link>
            );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Available Tracks
            </h2>
            <div className="mt-4 space-y-3">
              {latestTracks.length ? (
                latestTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 rounded-2xl bg-white/[0.03] px-3 py-3 transition hover:bg-white/[0.06]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                      <p className="truncate text-xs text-zinc-400">{track.artist}</p>
                    </div>
                    <span className="text-xs text-zinc-500">{track.duration || "—"}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                  No tracks loaded yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Quick Mixes
            </h2>
            <div className="mt-4 space-y-3">
              {quickMixes.length ? (
                quickMixes.map((playlist) => (
                  <Link
                    key={playlist.id || playlist._id}
                    to="/homepage/playlists"
                    className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                  >
                    <div
                      className={`mb-3 h-24 rounded-2xl bg-gradient-to-br ${playlist.gradient || "from-zinc-700 to-zinc-950"}`}
                    />
                    <p className="text-sm font-semibold text-white">{playlist.name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{playlist.description || "Untitled mix"}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>{playlist.trackCount || 0} tracks</span>
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        Open
                        <IoArrowForward />
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <Link
                  to="/homepage/playlists"
                  className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 text-center text-sm text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
                >
                  Create your first playlist to turn this area into a real shelf.
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 border-t border-white/[0.06] pt-5 lg:hidden">
          <button
            type="button"
            onClick={logoutHandler}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-red-500/20 hover:bg-red-500/8 hover:text-red-200"
          >
            <IoLogOutOutline className="text-base" />
            Log out
          </button>
        </section>
      </div>
    </div>
  );
};

export default DiscoverPage;
