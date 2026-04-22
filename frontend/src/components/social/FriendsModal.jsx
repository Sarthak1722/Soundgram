import { IoClose } from "react-icons/io5";

const FriendsModal = ({
  open,
  title,
  friends,
  isOwnProfile,
  pendingFriendId,
  onClose,
  onOpenProfile,
  onUnfriend,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_24px_80px_rgba(0,0,0,0.48)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-zinc-500">{friends.length} total</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close friends list"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-2 overflow-y-auto p-4">
          {friends.length ? (
            friends.map((friend) => (
              <div
                key={friend._id}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenProfile(friend)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <img
                    src={friend.profilePhoto}
                    alt={friend.fullName}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{friend.fullName}</p>
                    <p className="truncate text-xs text-zinc-500">@{friend.userName}</p>
                  </div>
                </button>
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => onUnfriend(friend)}
                    disabled={pendingFriendId === String(friend._id)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/5 disabled:opacity-50"
                  >
                    Unfriend
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
              No friends to show yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;
