// functions/uploadToStorage.js
const { Storage } = require("@google-cloud/storage");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const storage = new Storage();

module.exports = async function uploadImageFromLine(url, filename) {
  try {
    const bucket = storage.bucket(`baan-tk.appspot.com`);
    const filePath = path.join("/tmp", filename);
    const response = await axios.get(url, { responseType: "arraybuffer" });

    fs.writeFileSync(filePath, response.data);

    const destination = `line-uploads/${filename}`;
    const options = {
      destination: destination,
      resumable: false,
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          firebaseStorageDownloadTokens: uuidv4()
        }
      }
    };

    await bucket.upload(filePath, options);

    // Clean up temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${options.metadata.metadata.firebaseStorageDownloadTokens}`;

    return publicUrl;
  } catch (error) {
    console.error("❌ Upload error:", error);
    throw error;
  }
};
