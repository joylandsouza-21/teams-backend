// src/socket/user.socket.js

module.exports = function userSocket(io, socket) {
  const userId = socket.user.id;

  // =========================================================
  // ✅ USER JOINS PERSONAL ROOM (CRITICAL)
  // =========================================================
  socket.join(`user:${userId}`);
  console.log(`✅ User joined personal room: user:${userId}`);

  // =========================================================
  // ✅ USER ONLINE PRESENCE (BROADCAST)
  // =========================================================
  socket.broadcast.emit("user_online", {
    userId,
  });

  // =========================================================
  // ✅ CLIENT CAN REQUEST ONLINE USERS (OPTIONAL)
  // =========================================================
  socket.on("get_online_users", () => {
    const rooms = io.sockets.adapter.rooms;
    const onlineUsers = [];

    for (const room of rooms.keys()) {
      if (room.startsWith("user:")) {
        const id = room.split(":")[1];
        onlineUsers.push(Number(id));
      }
    }

    socket.emit("online_users", onlineUsers);
  });

  // =========================================================
  // ✅ GLOBAL NOTIFICATION SUPPORT (OPTIONAL)
  // =========================================================
  socket.on("send_notification", ({ toUserId, payload }) => {
    io.to(`user:${toUserId}`).emit("notification", {
      from: userId,
      payload,
    });
  });

  // =========================================================
  // ✅ MULTI-DEVICE SUPPORT (LOG ONLY)
  // =========================================================
  const connectionsForUser =
    io.sockets.adapter.rooms.get(`user:${userId}`)?.size || 1;

  console.log(
    `✅ Active socket connections for user ${userId}:`,
    connectionsForUser
  );

  // =========================================================
  // ✅ USER OFFLINE HANDLING
  // =========================================================
  socket.on("disconnect", (reason) => {
    console.log(`❌ User socket disconnected: ${userId}`, reason);

    const remainingConnections =
      io.sockets.adapter.rooms.get(`user:${userId}`)?.size || 0;

    // ✅ Only mark offline if ALL devices disconnected
    if (remainingConnections === 0) {
      socket.broadcast.emit("user_offline", {
        userId,
      });
    }
  });
};
