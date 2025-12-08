const presenceMap = require("../store/presence.store");
const { userGroupRooms } = require("../store/presence.groups"); 
// ✅ shared between presence.socket & timer

module.exports = function initPresenceTimer(io) {
  setInterval(() => {
    const now = Date.now();

    for (const [userId, data] of presenceMap.entries()) {
      // ✅ DO NOT AUTO-UPDATE MANUAL USERS
      if (data.manual) continue;

      const diff = now - data.lastActive;

      let newStatus = data.status;

      if (diff > 5 * 60 * 1000) newStatus = "away";     // 5 min → away
      else if (diff > 2 * 60 * 1000) newStatus = "idle"; // 2 min → idle
      else newStatus = "online";

      if (newStatus !== data.status) {
        presenceMap.set(userId, {
          ...data,
          status: newStatus,
        });

        emitPresence(io, userId);
      }
    }
  }, 30000); // ✅ every 30 sec
};

// ===============================
// ✅ SHARED EMITTER
// ===============================
function emitPresence(io, userId) {
  const data = presenceMap.get(userId);

  if (!data) return;

  const payload = {
    userId,
    status: data.status,
    lastActive: data.lastActive,
  };

  // ✅ 1. Emit to DIRECT watchers (sidebar, DM)
  io.to(`presence:user:${userId}`).emit("presence_update", payload);

  // ✅ 2. Emit to ONLY ACTIVE GROUPS (optimized)
  const groups = userGroupRooms.get(userId);

  if (groups) {
    for (const convoId of groups) {
      io.to(`presence:conversation:${convoId}`).emit(
        "presence_update",
        payload
      );
    }
  }
}
