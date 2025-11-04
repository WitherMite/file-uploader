const { supabase, uploadParallel } = require("./storage");
const multer = require("multer");
const crypto = require("node:crypto");

class supabaseStorage {
  constructor(opts) {
    this.getFilename = opts.filename;
  }
  _handleFile(req, file, cb) {
    this.getFilename(req, file, (e, filename) => {
      if (e) return cb(e);
      const filePackage = {
        Bucket: "Files",
        Key: filename,
        ContentType: file.mimeType,
        Body: file.stream,
      };

      uploadParallel(filePackage)
        .then((size) => {
          const publicUrl = supabase.storage
            .from("Files")
            .getPublicUrl(filename).data.publicUrl;

          console.table(size);

          // send file properties to be attached to req.file
          cb(null, {
            filename,
            path: publicUrl,
            size,
          });
        })
        .catch((e) => cb(e));
    });
  }
  _removeFile(req, file, cb) {
    supabase.storage
      .from("Files")
      .remove(file.path)
      .then(() => cb())
      .catch((e) => cb(e));
  }
}

const upload = multer({
  storage: new supabaseStorage({
    filename(req, file, cb) {
      try {
        const extension = file.originalname.substring(
          file.originalname.lastIndexOf(".")
        );
        cb(null, crypto.randomUUID() + extension);
      } catch (e) {
        cb(e);
      }
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_BYTES),
  },
});

module.exports = upload;
