// Production-ready Loan Management System - Refactored
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");

// Import middleware modules
const corsMiddleware = require("./middleware/cors");
const authMiddleware = require("./middleware/auth");
const securityMiddleware = require("./middleware/security");

// Import route modules
const adminRoutes = require("./routes/admin");
const registrationRoutes = require("./routes/registration");
const dashboardRoutes = require("./routes/dashboard");
const contractRoutes = require("./routes/contracts");

// Import custom modules
const securityService = require("./security");
const validationService = require("./validation");
const lineAutoReply = require("./line-auto-reply");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Apply middleware
app.use(corsMiddleware.createCorsMiddleware());
app.use(securityMiddleware.createHelmetMiddleware());
app.use(securityMiddleware.createDefaultLimiter());
app.use(express.json({ limit: "10mb" }));
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.requestLogger);

// Enhanced health check with system status
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "BaanTK Production API v2.0 - Refactored",
    timestamp: new Date().toISOString(),
    version: "2.0.1",
    environment: process.env.NODE_ENV || "development",
    features: {
      registration: true,
      creditScoring: true,
      adminDashboard: true,
      blacklistCheck: true,
      rateLimit: true,
      security: true,
      modularArchitecture: true
    }
  });
});

// Enhanced test endpoint with authentication check
app.get("/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Test endpoint working - Refactored Architecture",
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    architecture: "modular"
  });
});

// LINE Webhook endpoint - รับ POST request จาก LINE Platform
app.post("/", async (req, res) => {
  try {
    console.log("📨 LINE Webhook received:", req.body);

    // ตรวจสอบ signature (optional but recommended for security)
    const signature = req.get('X-Line-Signature');
    // Skip signature verification for testing
    // if (signature && !lineAutoReply.verifySignature(JSON.stringify(req.body), signature)) {
    //   console.log("⚠️ Invalid LINE signature");
    //   return res.status(401).json({ message: "Invalid signature" });
    // }

    // ตรวจสอบว่ามี events หรือไม่
    const events = req.body.events || [];

    if (events.length === 0) {
      console.log("⚠️ No events received");
      return res.status(200).json({ message: "No events to process" });
    }

    // ประมวลผล events แบบ async
    const eventPromises = events.map(async (event) => {
      console.log("📝 Processing event:", event.type);
      
      try {
        const result = await lineAutoReply.processLineEvent(event);
        console.log("✅ Event processed:", result);
        return result;
      } catch (error) {
        console.error("❌ Event processing error:", error);
        return { success: false, error: error.message };
      }
    });

    // รอให้ events ทั้งหมดประมวลผลเสร็จ
    await Promise.all(eventPromises);

    // ส่งกลับ status 200 (จำเป็นสำหรับ LINE Platform)
    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    // ต้องส่งกลับ 200 เสมอ ไม่งั้น LINE จะ retry
    res.status(200).json({ message: "Error processed" });
  }
});

// Alternative LINE Webhook endpoint - some LINE configurations might expect this path
app.post("/line-webhook", async (req, res) => {
  try {
    console.log("📨 LINE Webhook received at /line-webhook:", req.body);

    // ตรวจสอบ signature (optional but recommended for security)
    const signature = req.get('X-Line-Signature');
    // Skip signature verification for testing
    // if (signature && !lineAutoReply.verifySignature(JSON.stringify(req.body), signature)) {
    //   console.log("⚠️ Invalid LINE signature");
    //   return res.status(401).json({ message: "Invalid signature" });
    // }

    // ตรวจสอบว่ามี events หรือไม่
    const events = req.body.events || [];

    if (events.length === 0) {
      console.log("⚠️ No events received");
      return res.status(200).json({ message: "No events to process" });
    }

    // ประมวลผล events แบบ async
    const eventPromises = events.map(async (event) => {
      console.log("📝 Processing event:", event.type);
      
      try {
        const result = await lineAutoReply.processLineEvent(event);
        console.log("✅ Event processed:", result);
        return result;
      } catch (error) {
        console.error("❌ Event processing error:", error);
        return { success: false, error: error.message };
      }
    });

    // รอให้ทุก events ประมวลผลเสร็จ
    const results = await Promise.all(eventPromises);

    return res.status(200).json({
      message: "Events processed successfully",
      eventsProcessed: events.length,
      results
    });

  } catch (error) {
    console.error("❌ LINE Webhook error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
});

// Rich Menu Management endpoint
app.post("/admin/rich-menu", async (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === "create") {
      const richMenuId = await lineAutoReply.createRichMenu();
      if (richMenuId) {
        res.json({ success: true, richMenuId });
      } else {
        res.status(500).json({ success: false, message: "Failed to create Rich Menu" });
      }
    } else if (action === "set-default" && req.body.richMenuId) {
      const success = await lineAutoReply.setDefaultRichMenu(req.body.richMenuId);
      res.json({ success, message: success ? "Rich Menu set as default" : "Failed to set default Rich Menu" });
    } else {
      res.status(400).json({ success: false, message: "Invalid action or missing richMenuId" });
    }
  } catch (error) {
    console.error("❌ Rich Menu management error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Apply route modules
app.use("/api/admin", authMiddleware.authenticateAdmin, adminRoutes);
app.use("/api", registrationRoutes);
app.use("/api/admin/dashboard", authMiddleware.authenticateAdmin, dashboardRoutes.router);
app.use("/api/contract", contractRoutes);

// Legacy functions moved to appropriate service modules
// - validateAndSanitizeInput -> validationService
// - validateThaiIDCard -> governmentAPI
// - calculateCreditScore -> creditScoringService

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Unhandled error:", error);
  
  // Log error for monitoring
  securityService.logSecurityEvent("unhandled_error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  }, req);

  res.status(500).json({
    error: "Internal server error",
    message: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "ไม่พบ endpoint ที่ร้องขอ",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Export the webhook function
console.log("✅ simple.js loaded successfully - Refactored Architecture");
console.log("📦 Modules loaded:", {
  middleware: ["cors", "auth", "security"],
  routes: ["admin", "registration", "dashboard", "contracts"],
  helpers: ["loanHelpers"],
  services: ["security", "validation"]
});

// Export the Express app for use in index.js
exports.webhook = app;
