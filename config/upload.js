const prisma = require("./db");
const multer = require("multer");

const upload = multer({
  dest: "public/files/",
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE),
  },
});

module.exports = upload;
