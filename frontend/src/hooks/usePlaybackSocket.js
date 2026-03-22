import { useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/SocketContext.jsx";
import { applyPlaybackUpdate, resetPlayback } from "../redux/playbackSlice.js";

function jamKey(jam) {
  if (!jam) return "";
  if (jam.kind === "dm") return `dm:${jam.peerId}`;
  if (jam.kind === "group") return `group:${jam.roomId}`;
  return "";
}

/**
 * Joins the active jam room (1:1 pair or group:*) and applies playbackUpdate from the server.
 * Emits use peerUserId OR roomId only — never drives <audio> directly from UI clicks.
 */
export function usePlaybackSocket() {
  const { socket } = useSocket();
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.user.authUser);
  const activeJam = useSelector((s) => s.rooms.activeJam);

  const jamRef = useRef(activeJam);
  jamRef.current = activeJam;

  useEffect(() => {
    if (!socket) return;

    const onPlaybackUpdate = (payload) => {
      dispatch(applyPlaybackUpdate(payload));
    };

    socket.on("playbackUpdate", onPlaybackUpdate);
    return () => {
      socket.off("playbackUpdate", onPlaybackUpdate);
    };
  }, [socket, dispatch]);

  const key = jamKey(activeJam);

  useEffect(() => {
    if (!socket?.connected) return;
    if (!authUser?._id) return;

    if (!activeJam) {
      socket.emit("playbackLeave");
      dispatch(resetPlayback());
      return;
    }

    if (activeJam.kind === "dm") {
      socket.emit("playbackJoin", { peerUserId: activeJam.peerId });
    } else {
      socket.emit("playbackJoin", { roomId: activeJam.roomId });
    }
  }, [socket, socket?.connected, authUser?._id, key, dispatch]);

  useEffect(() => {
    return () => {
      socket?.emit("playbackLeave");
    };
  }, [socket]);

  const emitPlay = useCallback(() => {
    if (!socket?.connected) return;
    const jam = jamRef.current;
    if (!jam) return;
    if (jam.kind === "dm") socket.emit("play", { peerUserId: jam.peerId });
    else socket.emit("play", { roomId: jam.roomId });
  }, [socket]);

  const emitPause = useCallback(() => {
    if (!socket?.connected) return;
    const jam = jamRef.current;
    if (!jam) return;
    if (jam.kind === "dm") socket.emit("pause", { peerUserId: jam.peerId });
    else socket.emit("pause", { roomId: jam.roomId });
  }, [socket]);

  const emitSeek = useCallback(
    (time) => {
      if (!socket?.connected) return;
      const jam = jamRef.current;
      if (!jam) return;
      if (jam.kind === "dm") socket.emit("seek", { peerUserId: jam.peerId, time });
      else socket.emit("seek", { roomId: jam.roomId, time });
    },
    [socket],
  );

  const emitChangeTrack = useCallback(
    (trackId) => {
      if (!socket?.connected) return;
      const jam = jamRef.current;
      if (!jam) return;
      if (jam.kind === "dm") {
        socket.emit("changeTrack", { peerUserId: jam.peerId, trackId });
      } else {
        socket.emit("changeTrack", { roomId: jam.roomId, trackId });
      }
    },
    [socket],
  );

  const emitNextTrack = useCallback(() => {
    if (!socket?.connected) return;
    const jam = jamRef.current;
    if (!jam) return;
    if (jam.kind === "dm") socket.emit("nextTrack", { peerUserId: jam.peerId });
    else socket.emit("nextTrack", { roomId: jam.roomId });
  }, [socket]);

  const emitPrevTrack = useCallback(() => {
    if (!socket?.connected) return;
    const jam = jamRef.current;
    if (!jam) return;
    if (jam.kind === "dm") socket.emit("prevTrack", { peerUserId: jam.peerId });
    else socket.emit("prevTrack", { roomId: jam.roomId });
  }, [socket]);

  return {
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeTrack,
    emitNextTrack,
    emitPrevTrack,
    hasActiveJam: Boolean(activeJam),
  };
}
