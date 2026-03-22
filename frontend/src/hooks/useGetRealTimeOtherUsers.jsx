import { useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setotherUsers } from "../redux/userSlice.js";
import { useSocket } from "../context/SocketContext.jsx";

const useGetRealTimeOtherUsers = () => {
  const dispatch = useDispatch();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const onOtherUsers = (otherUsers) => {
      dispatch(setotherUsers(otherUsers));
    };

    socket.on("otherUsers", onOtherUsers);

    return () => {
      socket.off("otherUsers", onOtherUsers);
    };
  }, [socket, dispatch]);
};

export default useGetRealTimeOtherUsers;
