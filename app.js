const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
require("./modules/models");  
require("./modules/associations");

const path = require("path");

const app = express();
app.use(morgan("dev"));
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

app.use(express.json());

// routes
app.use("/api/auth", require("./modules/users/user.routes"));
app.use("/api/messages", require("./modules/messages/message.routes"));
app.use("/api/conversations", require("./modules/conversations/conversation.routes"));
app.use("/api/files", require("./modules/uploads/upload.route"));
app.use(
  "/api/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

module.exports = app;
