const { Server } = require("socket.io");
const chatSocket = require("./chat.socket");

const socketAuth = require("../middleware/socketAuth.middleware");
const socketRateLimit = require("../middleware/socketRateLimit");

let ioInstance;

module.exports = function (server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioInstance = io;

  // 1. Add socket authentication
  io.use(socketAuth);

  // 2. Add rate limiter (MUST BE io.use)
  io.use(socketRateLimit(20, 5000)); 
  // 20 events per 5 seconds

  // 3. Handle connections
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.user.id);

    socket.lastActive = Date.now();

    chatSocket(io, socket);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.user.id);
    });
  });

  return io;
};

// ✅ Export getter for REST APIs
module.exports.getIO = () => ioInstance;
