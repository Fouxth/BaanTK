// 🛡️ Security Middleware Module
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const securityService = require("../security");

// Enhanced security headers
function createHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://firebaseapp.com", "https://firebase.googleapis.com"]
      }
    }
  });
}

// Rate limiting with dynamic configuration
function createDefaultLimiter() {
  return rateLimit({
    ...securityService.getRateLimitConfig("default"),
    message: {
      error: "Too many requests from this IP",
      message: "คำขอเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้ง"
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Fix for Firebase Functions IP detection
    trustProxy: true,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    },
    handler: (req, res) => {
      securityService.logSecurityEvent("rate_limit_exceeded", {
        ip: req.ip,
        path: req.path,
        userAgent: req.get("User-Agent")
      }, req);

      res.status(429).json({
        error: "Too many requests",
        message: "คำขอเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้ง"
      });
    }
  });
}

function createRegistrationLimiter() {
  return rateLimit({
    ...securityService.getRateLimitConfig("registration"),
    message: {
      error: "Too many registration attempts",
      message: "ยื่นคำขอเกินจำนวนที่กำหนด (10 ครั้งต่อ 5 นาที) กรุณารอ 5 นาทีแล้วลองใหม่",
      retryAfter: "5 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    },
    handler: (req, res) => {
      securityService.logSecurityEvent("registration_rate_limit", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestBody: req.body
      }, req);

      res.status(429).json({
        error: "Too many registration attempts",
        message: "ยื่นคำขอเกินจำนวนที่กำหนด (10 ครั้งต่อ 5 นาที) กรุณารอ 5 นาทีแล้วลองใหม่",
        retryAfter: "5 minutes",
        timestamp: new Date().toISOString()
      });
    }
  });
}

function createLoginLimiter() {
  return rateLimit({
    ...securityService.getRateLimitConfig("login"),
    message: {
      error: "Too many login attempts",
      message: "ลองเข้าสู่ระบบเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้งในภายหลัง"
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    }
  });
}

// Enhanced security headers middleware
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-API-Version", "2.0");

  // API key validation for admin endpoints
  if (req.path.startsWith("/api/admin/")) {
    const apiKey = req.headers["x-api-key"];
    if (apiKey && apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({
        error: "Invalid API key",
        message: "รหัส API ไม่ถูกต้อง"
      });
    }
  }

  next();
}

// Request logging middleware
function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`📊 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);

    // Log suspicious requests
    if (res.statusCode >= 400 || duration > 5000) {
      securityService.logSecurityEvent("suspicious_request", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: duration,
        ip: req.ip,
        userAgent: req.get("User-Agent")
      }, req);
    }
  });

  next();
}

module.exports = {
  createHelmetMiddleware,
  createDefaultLimiter,
  createRegistrationLimiter,
  createLoginLimiter,
  securityHeaders,
  requestLogger
};