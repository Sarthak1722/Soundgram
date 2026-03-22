import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const API_URL = import.meta.env.VITE_API_URL;

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
};

/**
 * One Socket.IO client per logged-in user. Lives in React state only (not Redux).
 * Provider is intentionally outside <StrictMode> in main.jsx so dev double-mount
 * does not disconnect a socket that is still handshaking (avoids "closed before established" noise).
 */
export const SocketProvider = ({ children }) => {
  const authUserId = useSelector((store) => store.user.authUser?._id);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!API_URL) {
      console.warn("VITE_API_URL is not set; Socket.IO will not connect.");
    }

    if (!authUserId) {
      setSocket((prev) => {
        if (prev) {
          prev.removeAllListeners();
          prev.disconnect();
        }
        return null;
      });
      return;
    }

    const instance = io(API_URL, {
      query: { userId: authUserId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    setSocket(instance);

    return () => {
      instance.removeAllListeners();
      instance.disconnect();
    };
  }, [authUserId]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};
