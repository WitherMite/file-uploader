const { createClient } = require("@supabase/supabase-js");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const s3Client = new S3Client({
  forcePathStyle: true,
  region: "us-east-2",
  endpoint: "https://vaesanxutmldazzoiejx.storage.supabase.co/storage/v1/s3",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(
  "https://vaesanxutmldazzoiejx.supabase.co",
  process.env.SUPABASE_API_KEY
);

const uploadParallel = async (filePackage) => {
  const upload = new Upload({
    client: s3Client,
    params: filePackage,
  });
  let size = 0;
  upload.on("httpUploadProgress", (progress) => {
    console.log(progress);
    if (size < progress.loaded) size = progress.loaded;
  });
  await upload.done();
  return size;
};

module.exports = { supabase, uploadParallel };
