import { useEffect, useCallback } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setotherUsers } from "../redux/userSlice.js";
import { useSocket } from "../context/SocketContext.jsx";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Load directory once and again after Socket.IO reconnects so the inbox stays fresh.
 */
const useGetOtherUsers = () => {
  const dispatch = useDispatch();
  const { socket } = useSocket();

  const fetchOtherUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/user/`, { withCredentials: true });
      dispatch(setotherUsers(res.data));
    } catch (error) {
      console.error("fetchOtherUsers failed", error);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchOtherUsers();
  }, [fetchOtherUsers]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => fetchOtherUsers();
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [socket, fetchOtherUsers]);
};

export default useGetOtherUsers;
