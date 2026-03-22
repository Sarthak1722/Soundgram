import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { setselectedUser } from "../redux/userSlice.js";
import { isUserOnline, normalizeUserId } from "../utils/messageConversation.js";

const OtherUser = (prop) => {
  const dispatch = useDispatch();
  const selectedUserHandler = (user) => {
    dispatch(setselectedUser(user));
  };
  const { selectedUser, onlineUsers } = useSelector((store) => store.user);
  const isOnline = isUserOnline(onlineUsers, prop.user?._id);
  const isSelected = normalizeUserId(selectedUser?._id) === normalizeUserId(prop.user?._id);
  return (
    <>
        {/* user */}
        <div
          onClick={()=>selectedUserHandler(prop.user)}

          className=
          {`${isSelected ? "bg-white/30" : ""} flex items-center gap-3
          p-3
          rounded-xl
          ${isSelected ? "hover:bg-white/30" : "hover:bg-white/10"}
          transition-all
          cursor-pointer`}
          
        >
          <div className={`avatar ${isOnline? 'avatar-online' : ''}`}>
            <img
            src={prop.user?.profilePhoto}
            className="w-10 h-10 rounded-full"
            />
          </div>
          

          <div>
            <p className="text-sm text-white font-medium">{prop.user?.fullName}</p>
            <p className={`text-xs ${isOnline? 'text-green-400' : 'text-gray-200'} `}>{ isOnline? 'Online' : 'Last Seen Recently' }</p>
          </div>
        </div>
    </>
  );
};

export default OtherUser;