import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoChatbubbleEllipsesOutline,
  IoHeartOutline,
  IoNotificationsOutline,
  IoPersonAddOutline,
  IoSparklesOutline,
} from "react-icons/io5";
import { fetchNotifications } from "../api/notificationsApi.js";

function formatNotificationTime(timestamp) {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function notificationCopy(notification) {
  const actor = notification.actor?.userName ? `@${notification.actor.userName}` : "Someone";

  switch (notification.type) {
    case "friend_added":
      return {
        icon: IoPersonAddOutline,
        accent: "text-sky-300",
        text: `${actor} followed you back and is now part of your circle.`,
      };
    case "post_created":
      return {
        icon: IoSparklesOutline,
        accent: "text-emerald-300",
        text: `${actor} added a new post.`,
      };
    case "post_liked":
      return {
        icon: IoHeartOutline,
        accent: "text-rose-300",
        text: `${actor} liked a post.`,
      };
    case "post_commented":
      return {
        icon: IoChatbubbleEllipsesOutline,
        accent: "text-amber-300",
        text: `${actor} commented${notification.commentText ? `: "${notification.commentText}"` : " on a post."}`,
      };
    default:
      return {
        icon: IoNotificationsOutline,
        accent: "text-zinc-300",
        text: `${actor} had new activity.`,
      };
  }
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const nextNotifications = await fetchNotifications();
        if (!cancelled) {
          setNotifications(nextNotifications);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Could not load notifications.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedNotifications = useMemo(() => {
    const buckets = {
      today: [],
      week: [],
      older: [],
    };

    notifications.forEach((notification) => {
      const ageMs = Date.now() - new Date(notification.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      if (ageDays < 1) buckets.today.push(notification);
      else if (ageDays < 7) buckets.week.push(notification);
      else buckets.older.push(notification);
    });

    return buckets;
  }, [notifications]);

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-[#09090a]">
      <div className="w-full max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6 border-b border-white/10 pb-5">
          <p className="text-xl font-semibold tracking-tight text-white">Notifications</p>
          <p className="mt-1 text-sm text-zinc-500">
            Follows, friend activity, and fresh post interactions in one clean feed.
          </p>
        </header>

        {loading ? (
          <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-16 text-center text-sm text-zinc-500">
            Loading notifications...
          </div>
        ) : notifications.length ? (
          <div className="space-y-8">
            {[
              { label: "Today", items: groupedNotifications.today },
              { label: "This week", items: groupedNotifications.week },
              { label: "Earlier", items: groupedNotifications.older },
            ]
              .filter((section) => section.items.length)
              .map((section) => (
                <section key={section.label}>
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    {section.label}
                  </h2>
                  <div className="space-y-3">
                    {section.items.map((notification) => {
                      const copy = notificationCopy(notification);
                      const Icon = copy.icon;

                      return (
                        <div
                          key={notification._id}
                          className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-[#0f0f10] px-4 py-4"
                        >
                          <Link
                            to={`/homepage/profile/${notification.actor?._id}`}
                            className="flex min-w-0 flex-1 items-center gap-4"
                          >
                            <img
                              src={notification.actor?.profilePhoto}
                              alt={notification.actor?.userName}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Icon className={copy.accent} />
                                <p className="truncate text-sm text-white">{copy.text}</p>
                              </div>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                          </Link>
                          {notification.post?.previewUrl ? (
                            <Link
                              to={`/homepage/profile/${notification.post.author?._id}`}
                              className="shrink-0"
                            >
                              <img
                                src={notification.post.previewUrl}
                                alt=""
                                className="h-14 w-14 rounded-2xl object-cover"
                              />
                            </Link>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-16 text-center">
            <IoNotificationsOutline className="mx-auto text-4xl text-zinc-600" />
            <p className="mt-4 text-lg font-medium text-white">No notifications yet</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              New follows, friend posts, likes, and comments will start appearing here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
