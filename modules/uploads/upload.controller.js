const UploadService = require("./upload.service");

module.exports = {
  async uploadFiles(req, res) {
    try {
      const files = req.files;

      const uploaded = await UploadService.uploadFilesService(files);

      return res.status(201).json(uploaded);
    } catch (err) {
      return res.status(400).json({
        error: err.message || "File upload failed"
      });
    }
  }
};
