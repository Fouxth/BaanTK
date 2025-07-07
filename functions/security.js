// Enhanced JWT Authentication and Security Module
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const admin = require("firebase-admin");

class SecurityService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    // อ่าน admin token จาก .env หลายรูปแบบ - ห้ามใช้ fallback ที่ไม่ปลอดภัย
    this.adminToken = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET_TOKEN || process.env.ADMIN_PASSWORD;

    // ตรวจสอบว่ามี environment variables ที่จำเป็น
    if (!this.jwtSecret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    if (!this.encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }
    if (!this.adminToken) {
      throw new Error("ADMIN_SECRET_TOKEN environment variable is required");
    }

    console.log(`🔐 Security configuration loaded successfully`);
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

  // Encrypt sensitive data with modern AES-256-CBC + IV
  encrypt(text) {
    if (!text) return null;

    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      
      // Return IV + encrypted data
      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      return null;
    }
  }

  // Decrypt sensitive data with IV extraction
  decrypt(encryptedData) {
    if (!encryptedData) return null;

    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 2) {
        // Fallback for old encryption format
        return this._legacyDecrypt(encryptedData);
      }

      const [ivHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      // Try legacy decryption as fallback
      return this._legacyDecrypt(encryptedData);
    }
  }

  // Legacy decryption for backward compatibility
  _legacyDecrypt(encryptedText) {
    try {
      const decipher = crypto.createDecipher("aes-256-cbc", this.encryptionKey);
      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("Legacy decryption failed:", error);
      return null;
    }
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
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100
      },
      registration: {
        // ผ่อนปรนการจำกัดสำหรับการทดสอบ
        windowMs: parseInt(process.env.REGISTRATION_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes instead of 1 hour
        max: parseInt(process.env.REGISTRATION_LIMIT_MAX) || 10 // 10 attempts instead of 3
      },
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10 // เพิ่มจาก 5 เป็น 10
      },
      api: {
        windowMs: 60 * 1000, // 1 minute
        max: 100 // เพิ่มจาก 60 เป็น 100
      }
    };

    return configs[type] || configs.default;
  }
}

module.exports = new SecurityService();
