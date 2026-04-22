import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  IoHomeOutline,
  IoHome,
  IoSearchOutline,
  IoSearch,
  IoNotificationsOutline,
  IoNotifications,
  IoChatbubblesOutline,
  IoChatbubbles,
  IoMusicalNotesOutline,
  IoMusicalNotes,
  IoPersonCircleOutline,
  IoPersonCircle,
  IoAlbumsOutline,
  IoAlbums,
  IoLogOutOutline,
} from "react-icons/io5";
import { setAuthStatus, setauthUser, setotherUsers, setselectedUser } from "../redux/userSlice.js";
import { resetThread } from "../redux/messageSlice.js";
import { resetPlayback } from "../redux/playbackSlice.js";
import { resetRooms } from "../redux/roomsSlice.js";
import apiClient from "../api/client.js";

const navItems = [
  {
    to: "home",
    label: "Home",
    activeIcon: IoHome,
    inactiveIcon: IoHomeOutline,
  },
  {
    to: "search",
    label: "Search",
    activeIcon: IoSearch,
    inactiveIcon: IoSearchOutline,
  },
  {
    to: "notifications",
    label: "Alerts",
    activeIcon: IoNotifications,
    inactiveIcon: IoNotificationsOutline,
  },
  {
    to: "messages",
    label: "Messages",
    activeIcon: IoChatbubbles,
    inactiveIcon: IoChatbubblesOutline,
  },
  {
    to: "songs",
    label: "Songs",
    activeIcon: IoMusicalNotes,
    inactiveIcon: IoMusicalNotesOutline,
  },
  {
    to: "playlists",
    label: "Playlists",
    activeIcon: IoAlbums,
    inactiveIcon: IoAlbumsOutline,
  },
  {
    to: "profile",
    label: "Profile",
    activeIcon: IoPersonCircle,
    inactiveIcon: IoPersonCircleOutline,
  },
];

const navItemClass = ({ isActive }) =>
  [
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
  ].join(" ");

const NavIcon = ({ active, activeIcon, inactiveIcon }) => (
  <span className="text-xl opacity-90">
    {createElement(active ? activeIcon : inactiveIcon)}
  </span>
);

const MainNav = ({ variant = "desktop" }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { authUser } = useSelector((store) => store.user);
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

  const mobileNavItems = useMemo(() => {
    if (!isCompactMobile) {
      return navItems;
    }

    return navItems.filter((item) => item.to !== "notifications" && item.to !== "playlists");
  }, [isCompactMobile]);

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

  if (variant === "mobile") {
    return (
      <nav className="rounded-[22px] border border-white/10 bg-[#101010]/96 px-1.5 py-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))` }}
        >
          {mobileNavItems.map(({ to, label, activeIcon, inactiveIcon }) => (
            <NavLink key={to} to={to} className="min-w-0">
              {({ isActive }) => (
                <span
                  className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 py-1.5 text-[9px] font-semibold tracking-[0.08em] transition ${
                    isActive
                      ? "bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.14)]"
                      : "text-zinc-400"
                  }`}
                >
                  <span className="text-[1.05rem]">
                    {createElement(isActive ? activeIcon : inactiveIcon)}
                  </span>
                  <span className="truncate">{label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0c0c0c]/95 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#1DB954] to-emerald-700 text-lg font-black text-black shadow-lg shadow-emerald-900/40">
          🎶
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-white">Jamify</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Music · Social
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map(({ to, label, activeIcon, inactiveIcon }) => (
          <NavLink key={to} to={to} className={navItemClass}>
            {({ isActive }) => (
              <>
                <NavIcon active={isActive} activeIcon={activeIcon} inactiveIcon={inactiveIcon} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/[0.06] p-3">
        <NavLink
          to="profile"
          className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.08]"
        >
          <img
            src={authUser?.profilePhoto}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{authUser?.fullName}</p>
            <p className="truncate text-xs text-zinc-500">@{authUser?.userName}</p>
          </div>
        </NavLink>
        <button
          type="button"
          onClick={logoutHandler}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <IoLogOutOutline className="text-xl" />
          Log out
        </button>
      </div>
    </aside>
  );
};

export default MainNav;
