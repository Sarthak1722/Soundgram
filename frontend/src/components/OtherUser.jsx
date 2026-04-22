import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { setselectedUser } from "../redux/userSlice.js";
import { isUserOnline, normalizeUserId } from "../utils/messageConversation.js";
import { clearSelectedRoomChat } from "../redux/roomsSlice.js";

const OtherUser = (prop) => {
  const dispatch = useDispatch();
  const selectedUserHandler = (user) => {
    dispatch(clearSelectedRoomChat());
    dispatch(setselectedUser(user));
  };
  const { selectedUser, onlineUsers } = useSelector((store) => store.user);
  const isOnline = isUserOnline(onlineUsers, prop.user?._id);
  const isSelected = normalizeUserId(selectedUser?._id) === normalizeUserId(prop.user?._id);
  return (
    <button
      type="button"
      onClick={() => selectedUserHandler(prop.user)}
      className={`${isSelected ? "bg-white/18 ring-1 ring-white/12" : "bg-white/[0.03]"} flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all ${isSelected ? "hover:bg-white/18" : "hover:bg-white/[0.08]"} sm:bg-transparent sm:px-3 sm:py-2.5`}
    >
      <div className={`avatar shrink-0 ${isOnline ? "avatar-online" : ""}`}>
        <img
          src={prop.user?.profilePhoto}
          className="h-10 w-10 rounded-full object-cover sm:h-9 sm:w-9"
          alt={prop.user?.fullName}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{prop.user?.fullName}</p>
        <p className="truncate text-[12px] text-zinc-500 sm:text-xs">@{prop.user?.userName}</p>
        <p className={`mt-0.5 text-[11px] sm:text-xs ${isOnline ? "text-green-400" : "text-zinc-400"}`}>
          {isOnline ? "Online now" : "Friend"}
        </p>
      </div>

      <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500 sm:inline-flex">
        {isSelected ? "open" : "dm"}
      </span>
    </button>
  );
};

export default OtherUser;
