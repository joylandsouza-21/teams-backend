const http = require("http");
const app = require("./app");
const connectMongo = require("./config/mongo");
const sequelize = require("./config/postgres");
const socketSetup = require("./socket");


const server = http.createServer(app);

// attach socket
let io;
try {
  io = socketSetup(server);
  console.log("✅ Socket initialized");
} catch (err) {
  console.error("🔥 SOCKET SETUP CRASHED:", err);
}

const PORT = process.env.PORT || 9080;

(async () => {
  try {
    // MongoDB
    await connectMongo();

    // PostgreSQL authenticate
    await sequelize.authenticate();
    console.log("✓ PostgreSQL Connected");

    // await sequelize.sync({ alter: true });

    // Start server
    server.listen(PORT, () =>
      console.log(`🚀 Server running on ${PORT}`)
    );

  } catch (err) {
    console.error("❌ Startup Error:", err.message);
    process.exit(1);
  }
})();
