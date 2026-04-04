import React from "react";
import OtherUser from './OtherUser.jsx';
import { useSelector } from 'react-redux'

const OtherUsers = ({ users }) => {
  const {otherUsers} = useSelector(store => store.user);

  if(!otherUsers) return null;
  return (
    <div className="-mx-1.5 space-y-1 pb-3 sm:mx-0 sm:px-0">
        {users?.length ? users.map((user)=> {
            return (
                <OtherUser key={user._id} user={user}/>
            )
        }) : (
          <div className="mx-1 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center sm:mx-2">
            <p className="text-sm font-medium text-white">No chats found</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Try a different name or wait for more friends to come online.
            </p>
          </div>
        )}    
    </div>
  );
};

export default OtherUsers;
