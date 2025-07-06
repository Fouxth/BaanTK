const { Storage } = require("@google-cloud/storage");
const path = require("path");

const storage = new Storage();
const bucket = storage.bucket("baan-tk.appspot.com");

exports.uploadToStorage = async (filePath, filename) => {
  try {
    const destination = `uploads/${filename}.jpg`;
    await bucket.upload(filePath, {
      destination,
      public: true,
      metadata: {
        cacheControl: "public, max-age=31536000"
      }
    });
    return `https://storage.googleapis.com/${bucket.name}/${destination}`;
  } catch (error) {
    console.error("❌ Storage upload error:", error);
    throw error;
  }
};
