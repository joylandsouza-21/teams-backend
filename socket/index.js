const { Server } = require("socket.io");
const chatSocket = require("./chat.socket");
const jwt = require("jsonwebtoken");

const socketRateLimit = require("../middleware/socketRateLimit");
const userSocket = require("./user.socket");
const presenceSocket = require("./presence.socket");
const initPresenceTimer = require("./presence.timer");

let ioInstance;

module.exports = function (server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioInstance = io;
  
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
  
  
      if (!token) {
        console.log("❌ SOCKET AUTH FAILED: NO TOKEN");
        return next(new Error("AUTH_REQUIRED"));
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
      console.log("✅ SOCKET AUTH SUCCESS:", decoded.id);
  
      socket.user = decoded; // ✅ attach user to socket
      next();
    } catch (err) {
      console.log("❌ SOCKET AUTH ERROR:", err.message);
      return next(new Error("INVALID_TOKEN"));
    }
  });

  io.use(socketRateLimit(20, 5000)); 
  // 20 events per 5 seconds

  // 3. Handle connections
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.user.id);

    socket.lastActive = Date.now();

    chatSocket(io, socket);

    userSocket(io, socket);

    presenceSocket(io, socket);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.user.id);
    });
  });

  initPresenceTimer(io);

  return io;
};

// ✅ Export getter for REST APIs
module.exports.getIO = () => ioInstance;
