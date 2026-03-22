import React, { useState } from "react";
import OtherUsers from "./OtherUsers.jsx";
import { useSelector } from "react-redux";

const ChatSidebar = () => {
  const [search, setSearch] = useState("");
  const { otherUsers } = useSelector((store) => store.user);
  const filteredUsers = otherUsers?.filter((user) =>
    user.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-white/[0.08] bg-black/25 backdrop-blur-xl">
      <div className="border-b border-white/[0.08] px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Inbox</h2>
        <p className="mt-1 text-sm font-medium text-zinc-200">Direct messages</p>
      </div>

      <div className="p-3">
        <input
          type="text"
          placeholder="Search people..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <OtherUsers users={search ? filteredUsers : otherUsers} />
    </div>
  );
};

export default ChatSidebar;
