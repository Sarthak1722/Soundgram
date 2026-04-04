import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { SOCKET_URL } from "../config/runtime.js";
import { SocketContext } from "./socketContextInstance.js";

/**
 * One Socket.IO client per logged-in user. Lives in React state only (not Redux).
 * Provider is intentionally outside <StrictMode> in main.jsx so dev double-mount
 * does not disconnect a socket that is still handshaking (avoids "closed before established" noise).
 */
export const SocketProvider = ({ children }) => {
  const authUserId = useSelector((store) => store.user.authUser?._id);
  const socket = useMemo(() => {
    if (!authUserId) {
      return null;
    }

    return io(SOCKET_URL || undefined, {
      query: { userId: authUserId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
  }, [authUserId]);

  useEffect(() => {
    if (!socket) return undefined;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};
