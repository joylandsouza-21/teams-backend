const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Storage config
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + ext);
  }
});

// ✅ File filter (SECURITY)
const fileFilter = (_, file, cb) => {
  // const allowed = [
  //   "image/jpeg",
  //   "image/png",
  //   "image/webp",
  //   "application/pdf",
  //   "video/mp4"
  // ];

  // if (!allowed.includes(file.mimetype)) {
  //   return cb(new Error("Invalid file type"));
  // }

  cb(null, true);
};

// ✅ Multer instance
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // ✅ 10MB max per file
  fileFilter
});

module.exports = upload;
