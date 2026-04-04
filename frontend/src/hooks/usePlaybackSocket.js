import { useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "../context/useSocket.js";
import { applyPlaybackUpdate, playNext, playPrevious, setPlaybackQueue } from "../redux/playbackSlice.js";
import { effectivePlaybackTime } from "../utils/playbackTime.js";
import { getTrackDurationSeconds } from "../utils/trackDuration.js";
import { normalizePlaybackQueue } from "../utils/playbackTrack.js";

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
  const playback = useSelector((s) => s.playback);
  const authUserId = authUser?._id;

  const jamRef = useRef(activeJam);

  useEffect(() => {
    jamRef.current = activeJam;
  }, [activeJam]);

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
      return; // keep local playback state for solo
    }

    if (activeJam.kind === "dm") {
      socket.emit("playbackJoin", { peerUserId: activeJam.peerId });
    } else {
      socket.emit("playbackJoin", { roomId: activeJam.roomId });
    }
  }, [socket, socket?.connected, authUser?._id, key, activeJam]);

  useEffect(() => {
    return () => {
      socket?.emit("playbackLeave");
    };
  }, [socket]);

  const localUpdatePlayback = useCallback(
    (patch) => {
      if (activeJam) return; // only local when not jamming
      if (!authUser?._id) return;
      const now = Date.now();
      dispatch(
        applyPlaybackUpdate({
          roomId: null,
          serverNow: now,
          updatedBy: authUser._id,
          ...patch,
        }),
      );
    },
    [activeJam, authUser, dispatch],
  );

  const optimisticJamPlaybackUpdate = useCallback(
    (patch) => {
      const jam = jamRef.current;
      if (!jam || !authUserId) return;

      dispatch(
        applyPlaybackUpdate({
          roomId: playback.roomId,
          serverNow: Date.now(),
          updatedBy: authUserId,
          ...patch,
        }),
      );
    },
    [authUserId, dispatch, playback.roomId],
  );

  const emitPlay = useCallback(() => {
    const jam = jamRef.current;
    if (jam) {
      if (!socket?.connected) return;
      if (jam.kind === "dm") socket.emit("play", { peerUserId: jam.peerId });
      else socket.emit("play", { roomId: jam.roomId });
      return;
    }

    if (!playback.currentTrack) return;
    localUpdatePlayback({
      isPlaying: true,
      positionSeconds: effectivePlaybackTime(playback),
      playheadEpochMs: Date.now(),
    });
  }, [socket, playback, localUpdatePlayback]);

  const emitPause = useCallback(() => {
    const jam = jamRef.current;
    if (jam) {
      if (!socket?.connected) return;
      if (jam.kind === "dm") socket.emit("pause", { peerUserId: jam.peerId });
      else socket.emit("pause", { roomId: jam.roomId });
      return;
    }

    if (!playback.currentTrack) return;
    localUpdatePlayback({
      isPlaying: false,
      positionSeconds: effectivePlaybackTime(playback),
      playheadEpochMs: null,
    });
  }, [socket, playback, localUpdatePlayback]);

  const emitSeek = useCallback(
    (time) => {
      const durationSeconds = getTrackDurationSeconds(playback.currentTrack);
      const clampedTime = Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.min(Math.max(0, Number(time) || 0), durationSeconds)
        : Math.max(0, Number(time) || 0);
      const jam = jamRef.current;
      if (jam) {
        optimisticJamPlaybackUpdate({
          positionSeconds: clampedTime,
          playheadEpochMs: playback.isPlaying ? Date.now() : null,
        });
        if (!socket?.connected) return;
        if (jam.kind === "dm") socket.emit("seek", { peerUserId: jam.peerId, time: clampedTime });
        else socket.emit("seek", { roomId: jam.roomId, time: clampedTime });
        return;
      }

      if (!playback.currentTrack) return;
      localUpdatePlayback({
        positionSeconds: clampedTime,
        playheadEpochMs: playback.isPlaying ? Date.now() : null,
      });
    },
    [socket, playback, localUpdatePlayback, optimisticJamPlaybackUpdate],
  );

  const emitChangeTrack = useCallback(
    (trackId, track) => {
      const jam = jamRef.current;
      if (jam) {
        if (!socket?.connected) return;
        if (jam.kind === "dm") {
          socket.emit("changeTrack", { peerUserId: jam.peerId, trackId });
        } else {
          socket.emit("changeTrack", { roomId: jam.roomId, trackId });
        }
        return;
      }

      const nextTrack = track || playback.currentTrack;
      if (!nextTrack || nextTrack.id !== trackId) {
        // if we were not given a track object, we cannot resolve metadata
        return;
      }
      localUpdatePlayback({
        currentTrack: nextTrack,
        isPlaying: true,
        positionSeconds: 0,
        playheadEpochMs: Date.now(),
      });
    },
    [socket, playback, localUpdatePlayback],
  );

  const emitPlaySelection = useCallback(
    (tracks, startIndex = 0) => {
      const queue = normalizePlaybackQueue(tracks);
      if (!queue.length) return;

      const normalizedIndex = ((Number(startIndex) || 0) % queue.length + queue.length) % queue.length;
      const nextTrack = queue[normalizedIndex];
      if (!nextTrack) return;

      const jam = jamRef.current;
      if (jam) {
        if (!socket?.connected) return;
        const payload = { tracks: queue, startIndex: normalizedIndex };
        if (jam.kind === "dm") {
          socket.emit("playSelection", { ...payload, peerUserId: jam.peerId });
        } else {
          socket.emit("playSelection", { ...payload, roomId: jam.roomId });
        }
        return;
      }

      dispatch(setPlaybackQueue({ tracks: queue, startIndex: normalizedIndex }));
      localUpdatePlayback({
        currentTrack: nextTrack,
        queue,
        queueIndex: normalizedIndex,
        isPlaying: true,
        positionSeconds: 0,
        playheadEpochMs: Date.now(),
      });
    },
    [socket, dispatch, localUpdatePlayback],
  );

  const emitNextTrack = useCallback(() => {
    const jam = jamRef.current;
    if (jam) {
      if (!socket?.connected) return;
      if (jam.kind === "dm") socket.emit("nextTrack", { peerUserId: jam.peerId });
      else socket.emit("nextTrack", { roomId: jam.roomId });
      return;
    }

    // in solo mode, use Redux queue actions
    dispatch(playNext());
  }, [socket, dispatch]);

  const emitPrevTrack = useCallback(() => {
    const jam = jamRef.current;
    if (jam) {
      if (!socket?.connected) return;
      if (jam.kind === "dm") socket.emit("prevTrack", { peerUserId: jam.peerId });
      else socket.emit("prevTrack", { roomId: jam.roomId });
      return;
    }

    // In solo mode, use Redux queue actions
    dispatch(playPrevious());
  }, [socket, dispatch]);

  return {
    emitPlay,
    emitPause,
    emitSeek,
    emitChangeTrack,
    emitPlaySelection,
    emitNextTrack,
    emitPrevTrack,
    hasActiveJam: Boolean(activeJam),
  };
}
