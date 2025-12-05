const presenceStore = require("../presence/presence.store");

module.exports = function presenceSocket(io, socket) {
  const userId = socket.user.id;

  // ✅ When user connects
  const previous = presenceStore.get(userId);

  presenceStore.set(userId, {
    status: previous?.isManual ? previous.status : "online",
    isManual: previous?.isManual || false,
    lastActiveAt: Date.now(),
    socketId: socket.id,
    inCall: false
  });

  socket.join(`user:${userId}`);

  io.emit("presence_update", {
    userId,
    status: presenceStore.get(userId).status,
    inCall: false
  });

  console.log("✅ Presence Connected:", userId);


  // ===============================
  // ✅ AUTO ACTIVITY (mousemove, typing)
  // ===============================
  socket.on("user_active", () => {
    const user = presenceStore.get(userId);
    if (!user) return;

    if (!user.isManual) {
      user.status = "online";
    }

    user.lastActiveAt = Date.now();

    io.emit("presence_update", {
      userId,
      status: user.status,
      inCall: user.inCall
    });
  });


  // ===============================
  // ✅ MANUAL STATUS OVERRIDE
  // ===============================
  socket.on("set_manual_status", (status) => {
    const user = presenceStore.get(userId);
    if (!user) return;

    user.status = status;       // away | busy | online
    user.isManual = true;

    io.emit("presence_update", {
      userId,
      status: user.status,
      inCall: user.inCall
    });
  });


  // ===============================
  // ✅ CLEAR MANUAL (BACK TO AUTO)
  // ===============================
  socket.on("clear_manual_status", () => {
    const user = presenceStore.get(userId);
    if (!user) return;

    user.isManual = false;
    user.status = "online";

    io.emit("presence_update", {
      userId,
      status: "online",
      inCall: user.inCall
    });
  });


  // ===============================
  // ✅ CALL STATUS
  // ===============================
  socket.on("call_start", () => {
    const user = presenceStore.get(userId);
    if (!user) return;

    user.inCall = true;
    user.status = "busy";

    io.emit("presence_update", {
      userId,
      status: "busy",
      inCall: true
    });
  });

  socket.on("call_end", () => {
    const user = presenceStore.get(userId);
    if (!user) return;

    user.inCall = false;

    if (!user.isManual) {
      user.status = "online";
    }

    io.emit("presence_update", {
      userId,
      status: user.status,
      inCall: false
    });
  });


  // ===============================
  // ✅ DISCONNECT
  // ===============================
  socket.on("disconnect", () => {
    const user = presenceStore.get(userId);

    if (!user) return;

    // Remove only if same socket (multi-tab safe)
    if (user.socketId === socket.id) {
      presenceStore.delete(userId);

      io.emit("presence_update", {
        userId,
        status: "offline",
        inCall: false
      });
    }

    console.log("❌ Presence Disconnected:", userId);
  });
};
