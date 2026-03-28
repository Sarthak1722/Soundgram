import { useEffect } from "react";
import { useSocket } from "../context/SocketContext.jsx";

/**
 * Presence is socket-driven; request a fresh snapshot whenever this hook mounts or reconnects.
 */
const useGetOtherUsers = () => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const requestSnapshot = () => {
      socket.emit("presenceSync");
    };

    requestSnapshot();
    socket.on("connect", requestSnapshot);
    return () => socket.off("connect", requestSnapshot);
  }, [socket]);
};

export default useGetOtherUsers;
