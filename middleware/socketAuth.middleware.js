const jwt = require("jsonwebtoken");


module.exports = function socketAuth(io) {
  io.use((socket, next) => {
    try {
      // Token must be passed by client:
      // const socket = io("ws://localhost:5000", { auth: { token: "JWT_TOKEN" } })

      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("AUTH_REQUIRED"));
      }

      // Validate the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user data to socket
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };

      return next(); // allow connection
    } catch (err) {
      return next(new Error("INVALID_TOKEN"));
    }
  });
};
