const router = require("express").Router();
const MessageController = require("./message.controller");
const auth = require("../../middleware/auth.middleware");

router.get("/:conversationId/history", auth, MessageController.getHistory);

module.exports = router;
