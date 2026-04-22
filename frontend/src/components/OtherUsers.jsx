import React from "react";
import OtherUser from "./OtherUser.jsx";

const OtherUsers = ({ users }) => {
  return (
    <div className="-mx-1.5 space-y-1 pb-3 sm:mx-0 sm:px-0">
      {users?.length ? (
        users.map((user) => <OtherUser key={user._id} user={user} />)
      ) : (
        <div className="mx-1 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center sm:mx-2">
          <p className="text-sm font-medium text-white">No friend chats found</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Add people from Home search and they will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
};

export default OtherUsers;
