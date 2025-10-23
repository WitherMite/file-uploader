const multer = require("multer");

const upload = multer({
  dest: "public/files/",
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_BYTES),
  },
});

module.exports = upload;
