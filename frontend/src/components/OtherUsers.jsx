import React from "react";
import OtherUser from './OtherUser.jsx';
import useGetOtherUsers from '../hooks/useGetOtherUsers.jsx'
import useGetRealTimeOtherUsers from '../hooks/useGetRealTimeOtherUsers.jsx'
import { useSelector, useDispatch } from 'react-redux'

const OtherUsers = ({ users }) => {
  useGetOtherUsers();
  useGetRealTimeOtherUsers();
  const {otherUsers} = useSelector(store => store.user);

  if(!otherUsers) return null;
  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {
            users?.map((user)=>{
                return (
                    <OtherUser key={user._id} user={user}/>
                )
            })
        }    
    </div>
  );
};

export default OtherUsers;