const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
require("./modules/models");  
require("./modules/associations");

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

// app.get("/", (req, res) => res.send("Chat Backend Running"));

module.exports = app;
