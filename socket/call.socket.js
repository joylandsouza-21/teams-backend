// socket/call.socket.js
const CallService = require("../modules/calls/call.service");

module.exports = function callSocket(io, socket) {
  const userId = socket.user.id;

  // Helper: join per-call signaling room
  socket.on("join_call_room", ({ callId }) => {
    socket.join(`call:${callId}`);
  });

  // Accept call from popup (usually you’ll still do REST /join for token)
  socket.on("accept_call", async ({ callId }) => {
    try {
      // For media, frontend should call /api/calls/join to get token
      io.to(`call:${callId}`).emit("call_accepted", { callId, userId });
    } catch (err) {
      console.error("accept_call error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Reject call from popup
  socket.on("reject_call", async ({ callId }) => {
    try {
      await CallService.rejectCall({ userId, callId });
      io.to(`call:${callId}`).emit("call_rejected", { callId, userId });
    } catch (err) {
      console.error("reject_call error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Caller cancels before others accept
  socket.on("cancel_call", async ({ callId }) => {
    try {
      const { call, durationSeconds, missedUserIds, status } =
        await CallService.cancelCall({ userId, callId });

      io.to(`call:${callId}`).emit("call_cancelled", {
        callId,
        status,
        durationSeconds,
      });

      missedUserIds.forEach((uid) => {
        io.to(`user:${uid}`).emit("missed_call", {
          callId,
          conversationId: call.conversationId,
          from: call.started_by,
        });
      });
    } catch (err) {
      console.error("cancel_call error:", err);
      socket.emit("error", { message: err.message });
    }
  });

  // Optionally: when user leaves call via socket (e.g. "Leave" button)
  socket.on("leave_call", async ({ callId }) => {
    try {
      // Let REST /end handle ending full call,
      // or just update participant and let someone else end.
      // For now just leave socket room:
      socket.leave(`call:${callId}`);
      io.to(`call:${callId}`).emit("call_participant_left", {
        callId,
        userId,
      });
    } catch (err) {
      console.error("leave_call error:", err);
    }
  });
};
