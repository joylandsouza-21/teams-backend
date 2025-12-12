// routes/call.routes.js
const express = require("express");
const callController = require("./call.controller");
const router = express.Router();
const auth = require("../../middleware/auth.middleware");

router.post("/start", auth, callController.startCall);
router.post("/join", auth, callController.joinCall);
router.post("/end", auth, callController.endCall);
router.post("/reject", auth, callController.rejectCall);
router.post("/cancel", auth, callController.cancelCall);

module.exports = router;
