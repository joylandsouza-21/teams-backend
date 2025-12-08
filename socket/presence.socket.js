const ConversationService = require("../modules/conversations/conversation.service");
const { userGroupRooms } = require("../store/presence.groups");
const presenceMap = require("../store/presence.store");

// ✅ Multi-tab socket counter
const socketCountMap = new Map();
// ✅ Track which group rooms user belongs to

module.exports = function presenceSocket(io, socket) {
  const userId = socket.user.id;

  // ===============================
  // ✅ USER CONNECTED (MULTI TAB SAFE)
  // ===============================
  const current = socketCountMap.get(userId) || 0;
  socketCountMap.set(userId, current + 1);

  presenceMap.set(userId, {
    status: "online",
    lastActive: Date.now(),
    manual: false,
  });

  // ✅ join own direct presence room
  socket.join(`presence:user:${userId}`);

  emitPresence(userId);

  // ===============================
  // ✅ SUBSCRIBE TO DIRECT PRESENCE
  // ===============================
  socket.on("subscribe_presence", ({ userId }) => {
    socket.join(`presence:user:${userId}`);

    const data = presenceMap.get(userId);
    socket.emit("presence_update", {
      userId,
      status: data?.status || "offline",
      lastActive: data?.lastActive || null,
    });
  });

  // ✅ BULK DIRECT
  socket.on("subscribe_presence_bulk", ({ userIds }) => {
    if (!Array.isArray(userIds)) return;

    userIds.forEach((uid) => {
      socket.join(`presence:user:${uid}`);

      const data = presenceMap.get(uid);
      socket.emit("presence_update", {
        userId: uid,
        status: data?.status || "offline",
        lastActive: data?.lastActive || null,
      });
    });
  });

  // ===============================
  // ✅ SUBSCRIBE TO GROUP PRESENCE
  // ===============================
  socket.on("subscribe_group_presence", async ({ conversationId }) => {
    socket.join(`presence:conversation:${conversationId}`);

    const members = await ConversationService.getConversationMembers(conversationId);

    // Track user → groups
    if (!userGroupRooms.has(userId)) {
      userGroupRooms.set(userId, new Set());
    }
    userGroupRooms.get(userId).add(conversationId);

    // ✅ send snapshot for all members
    for (const user of members) {
      const uid = user.id;
      const data = presenceMap.get(uid);

      socket.emit("presence_update", {
        userId: uid,
        status: data?.status || "offline",
        lastActive: data?.lastActive || null,
      });
    }
  });

  socket.on("unsubscribe_group_presence", ({ conversationId }) => {
    socket.leave(`presence:conversation:${conversationId}`);

    const set = userGroupRooms.get(userId);
    if (set) set.delete(conversationId);
  });

  // ===============================
  // ✅ AUTO ACTIVITY
  // ===============================
  socket.on("user_active", () => {
    const data = presenceMap.get(userId);
    if (data?.manual) return;
    updateStatus(userId, "online", false);
  });

  // ===============================
  // ✅ MANUAL STATUS
  // ===============================
  socket.on("set_manual_status", ({ status }) => {
    if (status === "online") {
      updateStatus(userId, "online", false);
    } else {
      updateStatus(userId, status, true);
    }
  });

  // ===============================
  // ✅ CALL STATUS
  // ===============================
  socket.on("call_started", () => {
    updateStatus(userId, "on_call", true);
  });

  socket.on("call_ended", () => {
    updateStatus(userId, "online", false);
  });

  // ===============================
  // ✅ DISCONNECT (MULTI TAB SAFE)
  // ===============================
  socket.on("disconnect", () => {
    const current = socketCountMap.get(userId) || 1;
    const remaining = current - 1;

    if (remaining <= 0) {
      socketCountMap.delete(userId);

      const data = presenceMap.get(userId);
      if (!data?.manual) {
        updateStatus(userId, "offline", false);
      }
    } else {
      socketCountMap.set(userId, remaining);
    }
  });

  // ===============================
  // ✅ HELPERS
  // ===============================
  function updateStatus(userId, status, manual = false) {
    const prev = presenceMap.get(userId);

    presenceMap.set(userId, {
      status,
      lastActive: Date.now(),
      manual,
    });

    if (!prev || prev.status !== status) {
      emitPresence(userId);
    }
  }

  function emitPresence(userId) {
    const data = presenceMap.get(userId);

    // ✅ DIRECT EMIT
    io.to(`presence:user:${userId}`).emit("presence_update", {
      userId,
      status: data.status,
      lastActive: data.lastActive,
    });

    // ✅ GROUP EMIT (ONLY GROUPS USER BELONGS TO)
    const groups = userGroupRooms.get(userId);

    if (groups) {
      for (const convoId of groups) {
        io.to(`presence:conversation:${convoId}`).emit("presence_update", {
          userId,
          status: data.status,
          lastActive: data.lastActive,
        });
      }
    }
  }
};
