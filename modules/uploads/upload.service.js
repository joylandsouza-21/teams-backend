const path = require("path");

async function uploadFilesService(files) {
  if (!files || !files.length) {
    throw new Error("No files provided");
  }

  return files.map(file => ({
    url: `/uploads/${file.filename}`,
    fileName: file.originalname,
    type: file.mimetype,
    size: file.size
  }));
}

module.exports = {
  uploadFilesService
};
