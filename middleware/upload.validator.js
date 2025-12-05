const multer = require("multer");
const upload = require("./upload");

module.exports = function uploadValidator(field = "files", maxCount = 5) {
  return (req, res, next) => {

    const handler = upload.array(field, maxCount);

    handler(req, res, (err) => {

      // ✅ 1. MULTER INTERNAL ERRORS
      if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: 400,
            msg: "File too large. Maximum 10MB allowed."
          });
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            status: 400,
            msg: "Too many files uploaded."
          });
        }

        return res.status(400).json({
          status: 400,
          msg: err.message
        });
      }

      // ✅ 2. CUSTOM ERRORS (fileFilter etc.)
      if (err) {
        return res.status(400).json({
          status: 400,
          msg: err.message
        });
      }

      // ✅ 3. NO FILES UPLOADED CHECK
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: 400,
          msg: "No files uploaded"
        });
      }

      next(); // ✅ SAME FLOW AS ZOD ✅
    });
  };
};
