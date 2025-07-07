// 🌐 CORS Configuration Module
const cors = require("cors");

// Enhanced CORS with production-safe settings
function createCorsMiddleware() {
  return cors({
    origin: function(origin, callback) {
      console.log("🌐 CORS Origin:", origin);

      const allowedOrigins = [
        "https://baan-tk.web.app",
        "https://baan-tk.firebaseapp.com",
        "https://liff.line.me",
        /^https:\/\/.*\.ngrok\.io$/,
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000"
      ];

      // Allow all origins if no origin (Postman, curl, etc)
      if (!origin) {
        console.log("✅ CORS: No origin - allowed");
        return callback(null, true);
      }

      // Check if origin is in allowed list
      const isAllowed = allowedOrigins.some((allowed) =>
        typeof allowed === "string" ? allowed === origin : allowed.test(origin)
      );

      if (isAllowed) {
        console.log("✅ CORS: Origin allowed -", origin);
        callback(null, true);
      } else {
        console.log("❌ CORS: Origin blocked -", origin);
        
        // ตรวจสอบว่าอยู่ในโหมด production หรือไม่
        const isProduction = process.env.NODE_ENV === "production";
        
        if (isProduction) {
          // ในโหมด production ปฏิเสธ origin ที่ไม่ได้รับอนุญาต
          callback(new Error("Not allowed by CORS"));
        } else {
          // ในโหมด development อนุญาตเพื่อการทดสอบ แต่ให้ warning
          console.warn("⚠️ DEVELOPMENT MODE: Allowing blocked origin for testing");
          console.warn("⚠️ This should NOT happen in production!");
          callback(null, true);
        }
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-API-Key", "Origin", "Accept"],
    optionsSuccessStatus: 200,
    preflightContinue: false
  });
}

// Handle preflight OPTIONS requests explicitly
function handleOptionsRequest(req, res) {
  console.log("🔧 OPTIONS request received for:", req.path);
  res.header("Access-Control-Allow-Origin", req.get("Origin") || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-API-Key,Origin,Accept");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(200).send();
}

// Additional CORS headers middleware
function additionalCorsHeaders(req, res, next) {
  const origin = req.get("Origin");
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-API-Key,Origin,Accept");
  next();
}

module.exports = {
  createCorsMiddleware,
  handleOptionsRequest,
  additionalCorsHeaders
};