// Enhanced JWT Authentication and Security Module
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const admin = require("firebase-admin");

class SecurityService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-jwt-secret-key-here";
    this.encryptionKey = process.env.ENCRYPTION_KEY || "your-32-character-encryption-key";
    // อ่าน admin token จาก .env หลายรูปแบบ
    this.adminToken = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET_TOKEN || process.env.ADMIN_PASSWORD || "admin123";

    console.log(`🔐 Admin token configured from .env: ${this.adminToken ? "✅ SET" : "❌ NOT SET"}`);
    console.log(`🔐 Using token: ${this.adminToken.substring(0, 3)}***`);
  }

  // Generate JWT token for admin
  generateAdminToken(payload) {
    return jwt.sign(
      {
        ...payload,
        admin: true,
        type: "admin"
      },
      this.jwtSecret,
      {
        expiresIn: "8h",
        issuer: "baantk-admin",
        audience: "baantk-system"
      }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // Enhanced admin authentication middleware
  authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
        message: "กรุณาเข้าสู่ระบบ"
      });
    }

    const token = authHeader.substring(7);

    try {
      // Try JWT first
      const decoded = this.verifyToken(token);
      if (decoded.admin) {
        req.admin = decoded;
        return next();
      }
    } catch (error) {
      // Fallback to simple token for backward compatibility
      if (token === this.adminToken) {
        req.admin = { id: "admin", admin: true };
        return next();
      }
    }

    return res.status(401).json({
      error: "Invalid token",
      message: "รหัสผ่านไม่ถูกต้อง"
    });
  }

  // Encrypt sensitive data
  encrypt(text) {
    if (!text) return null;

    const cipher = crypto.createCipher("aes-256-cbc", this.encryptionKey);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  // Decrypt sensitive data
  decrypt(encryptedText) {
    if (!encryptedText) return null;

    const decipher = crypto.createDecipher("aes-256-cbc", this.encryptionKey);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Hash sensitive data (one-way)
  hash(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
  }

  // Generate secure random token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  // Validate password strength
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const issues = [];

    if (password.length < minLength) {
      issues.push("Password must be at least 8 characters long");
    }
    if (!hasUpperCase) {
      issues.push("Password must contain at least one uppercase letter");
    }
    if (!hasLowerCase) {
      issues.push("Password must contain at least one lowercase letter");
    }
    if (!hasNumbers) {
      issues.push("Password must contain at least one number");
    }
    if (!hasSpecialChar) {
      issues.push("Password must contain at least one special character");
    }

    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  // Log security events
  async logSecurityEvent(eventType, details, req = null) {
    try {
      const db = admin.firestore();

      const securityLog = {
        type: eventType,
        details: details,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: this.getEventSeverity(eventType),
        ip: req?.ip || null,
        userAgent: req?.get("User-Agent") || null,
        processed: false
      };

      await db.collection("securityLogs").add(securityLog);

      // Alert on high severity events
      if (securityLog.severity === "HIGH") {
        await this.sendSecurityAlert(eventType, details);
      }
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  // Get event severity level
  getEventSeverity(eventType) {
    const highSeverityEvents = [
      "multiple_failed_logins",
      "suspicious_registration",
      "blacklist_attempt",
      "admin_unauthorized_access"
    ];

    const mediumSeverityEvents = [
      "duplicate_application",
      "rate_limit_exceeded",
      "invalid_token_usage"
    ];

    if (highSeverityEvents.includes(eventType)) return "HIGH";
    if (mediumSeverityEvents.includes(eventType)) return "MEDIUM";
    return "LOW";
  }

  // Send security alert (implement based on your notification system)
  async sendSecurityAlert(eventType, details) {
    // TODO: Implement notification system
    // Could be email, SMS, LINE notify, etc.
    console.log(`🚨 SECURITY ALERT: ${eventType}`, details);
  }

  // Rate limiting configuration
  getRateLimitConfig(type = "default") {
    const configs = {
      default: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100
      },
      registration: {
        windowMs: parseInt(process.env.REGISTRATION_LIMIT_WINDOW_MS) || 60 * 60 * 1000,
        max: parseInt(process.env.REGISTRATION_LIMIT_MAX) || 3
      },
      login: {
        windowMs: 15 * 60 * 1000,
        max: 5
      },
      api: {
        windowMs: 60 * 1000,
        max: 60
      }
    };

    return configs[type] || configs.default;
  }
}

module.exports = new SecurityService();
