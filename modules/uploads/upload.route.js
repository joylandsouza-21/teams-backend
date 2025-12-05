const router = require("express").Router();
const controller = require("./upload.controller");
const auth = require("../../middleware/auth.middleware");
const uploadValidator = require("../../middleware/upload.validator");

// ✅ Multiple file upload
router.post(
  "/upload",
  auth,
  uploadValidator("files", 10),
  controller.uploadFiles
);

module.exports = router;
