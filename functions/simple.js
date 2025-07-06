// Production-ready Loan Management System
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// Import custom modules
const securityService = require("./security");
const validationService = require("./validation");
const creditScoringService = require("./creditScoring");
const governmentAPI = require("./governmentAPI");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://firebaseapp.com", "https://firebase.googleapis.com"]
    }
  }
}));

// Enhanced CORS with stricter security
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      "https://baan-tk.web.app",
      "https://baan-tk.firebaseapp.com",
      "https://liff.line.me",
      /^https:\/\/.*\.ngrok\.io$/,
      "http://localhost:3000",
      "http://localhost:8080"
    ];

    if (!origin || allowedOrigins.some((allowed) =>
      typeof allowed === "string" ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"],
  optionsSuccessStatus: 200
}));

// Rate limiting with dynamic configuration
const defaultLimiter = rateLimit({
  ...securityService.getRateLimitConfig("default"),
  message: {
    error: "Too many requests from this IP",
    message: "คำขอเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้ง"
  },
  standardHeaders: true,
  legacyHeaders: false,
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

const registrationLimiter = rateLimit({
  ...securityService.getRateLimitConfig("registration"),
  message: {
    error: "Too many registration attempts",
    message: "ยื่นคำขอเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้งในภายหลัง"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    securityService.logSecurityEvent("registration_rate_limit", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestBody: req.body
    }, req);

    res.status(429).json({
      error: "Too many registration attempts",
      message: "ยื่นคำขอเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้งในภายหลัง"
    });
  }
});

const loginLimiter = rateLimit({
  ...securityService.getRateLimitConfig("login"),
  message: {
    error: "Too many login attempts",
    message: "ลองเข้าสู่ระบบเกินจำนวนที่กำหนด กรุณาลองใหม่อีกครั้งในภายหลัง"
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(defaultLimiter);
app.use(express.json({ limit: "10mb" }));

// Enhanced security headers middleware
app.use((req, res, next) => {
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
});

// Request logging middleware
app.use((req, res, next) => {
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
});

// Input validation and sanitization
function validateAndSanitizeInput(data) {
  const errors = [];
  const sanitized = {};

  // Required fields validation
  const requiredFields = ["firstName", "lastName", "birthDate", "idCard", "address", "amount", "frequency", "userId"];
  for (const field of requiredFields) {
    if (!data[field] || String(data[field]).trim() === "") {
      errors.push(`${field} is required`);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, data: null };
  }

  // Sanitize and validate each field
  sanitized.firstName = String(data.firstName).trim().substring(0, 50);
  sanitized.lastName = String(data.lastName).trim().substring(0, 50);
  sanitized.address = String(data.address).trim().substring(0, 200);
  sanitized.userId = String(data.userId).trim();

  // Validate Thai ID Card (13 digits + checksum)
  const idCard = String(data.idCard).replace(/\D/g, "");
  if (idCard.length !== 13 || !validateThaiIDCard(idCard)) {
    errors.push("Invalid Thai ID card number");
  }
  sanitized.idCard = idCard;

  // Validate birth date (DD/MM/YYYY format)
  const birthDateMatch = String(data.birthDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!birthDateMatch) {
    errors.push("Birth date must be in DD/MM/YYYY format");
  } else {
    const [, day, month, year] = birthDateMatch;
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age < 18 || age > 80) {
      errors.push("Age must be between 18 and 80 years");
    }
    sanitized.birthDate = `${day}/${month}/${year}`;
  }

  // Validate loan amount
  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount < 100 || amount > 50000) {
    errors.push("Loan amount must be between 100 and 50,000 baht");
  }
  sanitized.amount = amount;

  // Validate frequency
  if (!["daily", "weekly", "monthly"].includes(data.frequency)) {
    errors.push("Invalid payment frequency");
  }
  sanitized.frequency = data.frequency;

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? sanitized : null
  };
}

// Thai ID Card validation with checksum
function validateThaiIDCard(idCard) {
  if (idCard.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(idCard[i]) * (13 - i);
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(idCard[12]);
}

// Calculate credit score based on profile
function calculateCreditScore(userData) {
  let score = 600; // Base score

  // Age factor (25-45 gets higher score)
  const birthYear = parseInt(userData.birthDate.split("/")[2]);
  const age = new Date().getFullYear() - birthYear;
  if (age >= 25 && age <= 45) score += 50;
  else if (age >= 18 && age <= 24) score += 20;
  else if (age >= 46 && age <= 65) score += 30;

  // Amount factor (lower amount = higher score)
  if (userData.amount <= 5000) score += 50;
  else if (userData.amount <= 15000) score += 30;
  else if (userData.amount <= 30000) score += 10;

  // Frequency factor (monthly = more stable)
  if (userData.frequency === "monthly") score += 30;
  else if (userData.frequency === "weekly") score += 20;
  else if (userData.frequency === "daily") score += 10;

  return Math.min(Math.max(score, 300), 850); // Cap between 300-850
}

// Check blacklist with enhanced logging
async function checkBlacklist(idCard, userId) {
  try {
    const blacklistQuery = await db.collection("blacklist")
      .where("idCard", "==", idCard)
      .get();

    const userBlacklistQuery = await db.collection("blacklist")
      .where("userId", "==", userId)
      .get();

    const isBlacklisted = !blacklistQuery.empty || !userBlacklistQuery.empty;

    if (isBlacklisted) {
      // Log blacklist hit
      const blacklistData = [];
      blacklistQuery.forEach((doc) => blacklistData.push(doc.data()));
      userBlacklistQuery.forEach((doc) => blacklistData.push(doc.data()));

      console.log("🚫 Blacklist hit:", { idCard, userId, blacklistData });
    }

    return isBlacklisted;
  } catch (error) {
    console.error("Error checking blacklist:", error);
    return false;
  }
}

// Check for duplicate applications with enhanced detection
async function checkDuplicateApplication(idCard, userId) {
  try {
    const [duplicateQuery, userDuplicateQuery, recentQuery] = await Promise.all([
      db.collection("borrowers")
        .where("idCard", "==", idCard)
        .where("status", "in", ["pending", "approved"])
        .get(),
      db.collection("borrowers")
        .where("userId", "==", userId)
        .where("status", "in", ["pending", "approved"])
        .get(),
      db.collection("borrowers")
        .where("userId", "==", userId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(
          new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        ))
        .get()
    ]);

    const isDuplicate = !duplicateQuery.empty || !userDuplicateQuery.empty;
    const hasRecentApplication = recentQuery.size > 0;

    if (isDuplicate || hasRecentApplication) {
      console.log("🔄 Duplicate application detected:", {
        idCard,
        userId,
        duplicateByIdCard: !duplicateQuery.empty,
        duplicateByUserId: !userDuplicateQuery.empty,
        recentApplications: recentQuery.size
      });
    }

    return isDuplicate || hasRecentApplication;
  } catch (error) {
    console.error("Error checking duplicates:", error);
    return false;
  }
}

// Enhanced health check with system status
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "BaanTK Production API v2.0",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    features: {
      registration: true,
      creditScoring: true,
      adminDashboard: true,
      blacklistCheck: true,
      rateLimit: true,
      security: true
    }
  });
});

// Enhanced test endpoint with authentication check
app.get("/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Test endpoint working",
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("User-Agent")
  });
});

// LINE Webhook endpoint - รับ POST request จาก LINE Platform
app.post("/", (req, res) => {
  try {
    console.log("📨 LINE Webhook received:", req.body);

    // ตรวจสอบว่ามี events หรือไม่
    const events = req.body.events || [];

    if (events.length === 0) {
      console.log("⚠️ No events received");
      return res.status(200).json({ message: "No events to process" });
    }

    // ประมวลผล events
    events.forEach((event) => {
      console.log("📝 Processing event:", event.type);

      if (event.type === "message" && event.message.type === "text") {
        console.log("💬 Text message:", event.message.text);
        // TODO: ประมวลผลข้อความจาก LINE
      }
    });

    // ส่งกลับ status 200 (จำเป็นสำหรับ LINE Platform)
    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    // ต้องส่งกลับ 200 เสมอ ไม่งั้น LINE จะ retry
    res.status(200).json({ message: "Error processed" });
  }
});

// LIFF Register endpoint with production-grade security and validation
app.post("/api/liff-register", registrationLimiter, async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`📥 Registration request [${requestId}]:`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      hasBody: !!req.body
    });

    // Enhanced input validation using validation service
    const validation = validationService.validateRegistration(req.body);
    if (!validation.isValid) {
      console.log(`❌ Validation failed [${requestId}]:`, validation.errors);

      // Log validation failure
      await securityService.logSecurityEvent("validation_failed", {
        requestId,
        errors: validation.errors,
        requestBody: req.body
      }, req);

      return res.status(400).json({
        error: "Validation failed",
        message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
        details: validation.errors
      });
    }

    const userData = validation.data;
    console.log(`✅ Input validation passed [${requestId}]:`, userData.firstName, userData.lastName);

    // 🔍 ตรวจสอบรูปแบบบัตรประชาชน
    console.log(`🔍 Verifying ID Card format [${requestId}]`);
    
    const idCardValidation = governmentAPI.validateIDCardBasic(userData.idCard);
    if (!idCardValidation.isValid) {
      console.log(`❌ ID Card validation failed [${requestId}]:`, idCardValidation.errors);

      await securityService.logSecurityEvent("invalid_id_card", {
        requestId,
        idCard: userData.idCard,
        errors: idCardValidation.errors
      }, req);

      return res.status(400).json({
        error: "Invalid ID Card",
        message: "เลขบัตรประชาชนไม่ถูกต้อง",
        details: idCardValidation.errors
      });
    }

    // 🔍 ตรวจสอบสถานะบัตรประชาชน
    const cardVerification = await governmentAPI.verifyIDCardStatus(userData.idCard);
    if (!cardVerification.valid) {
      console.log(`❌ ID Card verification failed [${requestId}]:`, cardVerification.message);

      await securityService.logSecurityEvent("id_card_verification_failed", {
        requestId,
        idCard: userData.idCard,
        status: cardVerification.status,
        message: cardVerification.message
      }, req);

      return res.status(400).json({
        error: "ID Card verification failed",
        message: cardVerification.message,
        status: cardVerification.status
      });
    }

    console.log(`✅ ID Card verified successfully [${requestId}]`);

    // เพิ่มข้อมูลการตรวจสอบเข้ากับข้อมูลผู้ใช้
    const enhancedUserData = {
      ...userData,
      idCardVerified: true,
      idCardStatus: cardVerification.status,
      verificationTimestamp: new Date().toISOString()
    };

    console.log(`✅ Enhanced user data prepared [${requestId}]`);

    // Enhanced blacklist check with detailed logging
    const isBlacklisted = await checkBlacklist(enhancedUserData.idCard, enhancedUserData.userId);
    if (isBlacklisted) {
      console.log(`🚫 Blacklist detected [${requestId}]:`, enhancedUserData.idCard);

      // Log blacklist attempt with high priority
      await securityService.logSecurityEvent("blacklist_attempt", {
        requestId,
        idCard: enhancedUserData.idCard,
        userId: enhancedUserData.userId,
        userName: `${enhancedUserData.firstName} ${enhancedUserData.lastName}`,
        severity: "HIGH"
      }, req);

      return res.status(403).json({
        error: "Application not permitted",
        message: "ไม่สามารถยื่นคำขอได้ กรุณาติดต่อเจ้าหน้าที่"
      });
    }

    // Enhanced duplicate check
    const isDuplicate = await checkDuplicateApplication(enhancedUserData.idCard, enhancedUserData.userId);
    if (isDuplicate) {
      console.log(`🔄 Duplicate application [${requestId}]:`, enhancedUserData.idCard);

      await securityService.logSecurityEvent("duplicate_application", {
        requestId,
        idCard: enhancedUserData.idCard,
        userId: enhancedUserData.userId
      }, req);

      return res.status(409).json({
        error: "Duplicate application",
        message: "มีการยื่นคำขอที่อยู่ในระหว่างการพิจารณาแล้ว หรือยื่นคำขอใหม่เร็วเกินไป"
      });
    }

    // Enhanced credit scoring with detailed analysis
    const creditAssessment = await creditScoringService.calculateCreditScore(enhancedUserData, enhancedUserData.userId);
    console.log(`📊 Credit assessment [${requestId}]:`, {
      score: creditAssessment.score,
      grade: creditAssessment.grade,
      riskLevel: creditAssessment.riskLevel,
      recommendation: creditAssessment.recommendation
    });

    // Calculate loan terms with enhanced logic
    const loanTerms = calculateLoanTerms(enhancedUserData, creditAssessment);

    // Auto-approval logic with enhanced criteria
    const autoApproval = determineAutoApproval(creditAssessment, enhancedUserData, loanTerms);

    // Create comprehensive borrower record
    const borrowerData = createBorrowerRecord(enhancedUserData, creditAssessment, loanTerms, autoApproval, req, requestId);

    // Save to Firestore with transaction
    const docRef = await db.collection("borrowers").add(borrowerData);
    console.log(`💾 Borrower record created [${requestId}]:`, docRef.id);

    // Log successful application
    await Promise.all([
      db.collection("applicationLogs").add({
        type: "new_application",
        requestId,
        borrowerId: docRef.id,
        userId: enhancedUserData.userId,
        idCard: enhancedUserData.idCard,
        amount: enhancedUserData.amount,
        creditScore: creditAssessment.score,
        status: autoApproval.status,
        autoApproved: autoApproval.autoApproved,
        dataSource: "government_registry",
        verificationTimestamp: enhancedUserData.verificationTimestamp,
        processingTime: Date.now() - startTime,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }),

      // Send notification if approved
      autoApproval.autoApproved ? sendApprovalNotification(enhancedUserData, loanTerms, docRef.id) : null
    ]);

    // Generate comprehensive response
    const responseData = {
      success: true,
      message: autoApproval.autoApproved ?
        "🎉 อนุมัติเงินกู้สำเร็จ! จำนวนเงินจะถูกโอนเข้าบัญชีภายใน 24 ชั่วโมง" :
        "📝 ยื่นคำขอสำเร็จ! รอการอนุมัติจากเจ้าหน้าที่",
      applicationId: docRef.id,
      requestId: requestId,
      data: {
        applicant: {
          firstName: enhancedUserData.firstName,
          lastName: enhancedUserData.lastName,
          idCard: `${enhancedUserData.idCard.substr(0, 4)}-xxxx-xxxx-x${enhancedUserData.idCard.substr(-1)}`,
          verified: enhancedUserData.idCardVerified
        },
        loan: {
          requestedAmount: enhancedUserData.amount,
          totalAmount: loanTerms.totalWithInterest,
          interestRate: `${(loanTerms.interestRate * 100).toFixed(1)}%`,
          frequency: enhancedUserData.frequency,
          dueDate: loanTerms.dueDate.toLocaleDateString("th-TH"),
          installmentAmount: loanTerms.installmentAmount
        },
        assessment: {
          creditScore: creditAssessment.score,
          grade: creditAssessment.grade,
          riskLevel: creditAssessment.riskLevel,
          status: autoApproval.status,
          autoApproved: autoApproval.autoApproved
        },
        verification: {
          idCardStatus: enhancedUserData.idCardStatus,
          verifiedAt: enhancedUserData.verificationTimestamp
        },
        nextSteps: autoApproval.autoApproved ?
          ["กรุณาเตรียมเอกสารประกอบการกู้", "รอการติดต่อจากเจ้าหน้าที่"] :
          ["รอการอนุมัติจากเจ้าหน้าที่", "ระยะเวลาพิจารณา 1-3 วันทำการ"]
      }
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ Registration completed [${requestId}]:`, {
      id: docRef.id,
      name: `${enhancedUserData.titleName} ${enhancedUserData.officialFirstName || enhancedUserData.firstName} ${enhancedUserData.officialLastName || enhancedUserData.lastName}`,
      amount: enhancedUserData.amount,
      status: autoApproval.status,
      creditScore: creditAssessment.score,
      dataSource: "government_registry",
      processingTime: `${processingTime}ms`
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error(`❌ Registration error [${requestId}]:`, error);

    // Enhanced error logging
    try {
      await Promise.all([
        db.collection("errorLogs").add({
          type: "registration_error",
          requestId,
          error: error.message,
          stack: error.stack,
          requestBody: req.body,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }),

        securityService.logSecurityEvent("registration_system_error", {
          requestId,
          error: error.message,
          severity: "HIGH"
        }, req)
      ]);
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    res.status(500).json({
      error: "Internal server error",
      message: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่",
      requestId: requestId
    });
  }
});

// Admin authentication using enhanced security service
const authenticateAdmin = securityService.authenticateAdmin.bind(securityService);

// Admin login endpoint with JWT token generation
app.post("/api/admin/login", loginLimiter, async (req, res) => {
  try {
    const { username, password, token } = req.body;

    // For production, implement proper user authentication
    // For now, use simple token or credentials check
    let isValidAdmin = false;
    let adminData = {};

    if (token && (token === process.env.ADMIN_SECRET_TOKEN || token === process.env.ADMIN_TOKEN)) {
      isValidAdmin = true;
      adminData = { id: "admin", username: "admin", type: "token" };
    } else if (username === "admin" && password === "admin123") {
      isValidAdmin = true;
      adminData = { id: "admin", username: "admin", type: "credentials" };
    }

    if (!isValidAdmin) {
      await securityService.logSecurityEvent("admin_login_failed", {
        username: username,
        ip: req.ip,
        userAgent: req.get("User-Agent")
      }, req);

      return res.status(401).json({
        error: "Invalid credentials",
        message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
      });
    }

    // Generate JWT token
    const jwtToken = securityService.generateAdminToken(adminData);

    // Log successful login
    await securityService.logSecurityEvent("admin_login_success", {
      adminId: adminData.id,
      username: adminData.username,
      loginType: adminData.type
    }, req);

    res.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token: jwtToken,
      admin: {
        id: adminData.id,
        username: adminData.username,
        permissions: ["read", "write", "approve", "reject", "blacklist"]
      },
      expiresIn: "8h"
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
    });
  }
});

// Get all borrowers with enhanced filtering and pagination (Admin only)
app.get("/api/admin/borrowers", authenticateAdmin, async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      riskLevel,
      startDate,
      endDate
    } = req.query;

    // Validate pagination
    const pagination = validationService.validatePagination(page, limit);

    // Validate date range
    const dateRange = validationService.validateDateRange(startDate, endDate);
    if (!dateRange.isValid) {
      return res.status(400).json({ error: dateRange.error });
    }

    let query = db.collection("borrowers");

    // Apply filters
    if (status) {
      query = query.where("status", "==", status);
    }

    if (riskLevel) {
      query = query.where("riskLevel", "==", riskLevel);
    }

    if (dateRange.start) {
      query = query.where("createdAt", ">=", admin.firestore.Timestamp.fromDate(dateRange.start));
    }

    if (dateRange.end) {
      query = query.where("createdAt", "<=", admin.firestore.Timestamp.fromDate(dateRange.end));
    }

    // Apply sorting
    query = query.orderBy(sortBy, sortOrder)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);

    const snapshot = await query.get();

    const borrowers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Filter by search term if provided
      if (search) {
        const searchTerm = search.toLowerCase();
        const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
        const idCard = data.idCard || "";

        if (!fullName.includes(searchTerm) && !idCard.includes(searchTerm)) {
          return; // Skip this record
        }
      }

      borrowers.push({
        id: doc.id,
        ...data,
        // Mask sensitive data
        idCard: data.idCard ? `${data.idCard.substr(0, 4)}-xxxx-xxxx-x${data.idCard.substr(-1)}` : null,
        // Convert timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        approvedAt: data.approvedAt?.toDate?.()?.toISOString(),
        dueDate: data.dueDate?.toDate?.()?.toISOString(),
        nextPaymentDate: data.nextPaymentDate?.toDate?.()?.toISOString()
      });
    });

    // Get total count for pagination
    const totalQuery = await db.collection("borrowers").get();
    const totalCount = totalQuery.size;

    res.json({
      success: true,
      data: borrowers,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pagination.limit),
        hasNext: pagination.page * pagination.limit < totalCount,
        hasPrev: pagination.page > 1
      },
      filters: {
        status,
        riskLevel,
        search,
        startDate,
        endDate,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    console.error("❌ Error fetching borrowers:", error);
    res.status(500).json({
      error: "Failed to fetch borrowers",
      message: "ไม่สามารถดึงข้อมูลผู้กู้ได้"
    });
  }
});

// Enhanced approve/reject loan application (Admin only)
app.post("/api/admin/approve", authenticateAdmin, async (req, res) => {
  try {
    // Validate input using validation service
    const validation = validationService.validateAdminAction(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.errors
      });
    }

    const { borrowerId, action, notes } = validation.data;

    const borrowerRef = db.collection("borrowers").doc(borrowerId);
    const borrowerDoc = await borrowerRef.get();

    if (!borrowerDoc.exists) {
      return res.status(404).json({
        error: "Borrower not found",
        message: "ไม่พบข้อมูลผู้กู้"
      });
    }

    const borrowerData = borrowerDoc.data();

    // Check if already processed
    if (["approved", "rejected"].includes(borrowerData.status)) {
      return res.status(409).json({
        error: "Already processed",
        message: "คำขอนี้ได้รับการพิจารณาแล้ว",
        currentStatus: borrowerData.status
      });
    }

    const status = action === "approve" ? "approved" : "rejected";
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Prepare update data
    const updateData = {
      status: status,
      adminNotes: notes || "",
      reviewedAt: now,
      updatedAt: now,
      reviewedBy: req.admin.id || "admin"
    };

    // If approved, set additional fields
    if (action === "approve") {
      updateData.approvedAt = now;
      updateData.approvedAmount = borrowerData.requestedAmount;
      updateData.disbursementStatus = "pending";
    }

    // Update borrower record
    await borrowerRef.update(updateData);

    // Log admin action with detailed information
    await Promise.all([
      db.collection("adminLogs").add({
        type: "loan_review",
        action: action,
        borrowerId: borrowerId,
        borrowerName: `${borrowerData.firstName} ${borrowerData.lastName}`,
        amount: borrowerData.requestedAmount,
        creditScore: borrowerData.creditScore,
        previousStatus: borrowerData.status,
        newStatus: status,
        notes: notes,
        adminId: req.admin.id || "admin",
        timestamp: now
      }),

      // Send notification to borrower
      sendStatusUpdateNotification(borrowerData, status, notes)
    ]);

    console.log(`✅ Loan ${action}d:`, {
      borrowerId,
      borrowerName: `${borrowerData.firstName} ${borrowerData.lastName}`,
      amount: borrowerData.requestedAmount,
      newStatus: status
    });

    res.json({
      success: true,
      message: `เงินกู้${action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}สำเร็จ`,
      data: {
        borrowerId: borrowerId,
        borrowerName: `${borrowerData.firstName} ${borrowerData.lastName}`,
        amount: borrowerData.requestedAmount,
        previousStatus: borrowerData.status,
        newStatus: status,
        reviewedAt: new Date().toISOString(),
        notes: notes
      }
    });
  } catch (error) {
    console.error("❌ Error updating loan status:", error);

    // Log error
    await securityService.logSecurityEvent("admin_action_error", {
      action: "approve_reject",
      error: error.message,
      adminId: req.admin?.id
    }, req);

    res.status(500).json({
      error: "Failed to update loan status",
      message: "ไม่สามารถอัพเดทสถานะเงินกู้ได้"
    });
  }
});

// Send status update notification
async function sendStatusUpdateNotification(borrowerData, status, notes) {
  try {
    const message = status === "approved" ?
      `🎉 ยินดีด้วย! เงินกู้ของคุณได้รับการอนุมัติแล้ว\nจำนวน: ${borrowerData.requestedAmount?.toLocaleString()} บาท\nจะโอนเข้าบัญชีภายใน 24 ชั่วโมง` :
      `😔 ขออภัย เงินกู้ของคุณไม่ได้รับการอนุมัติ\n${notes ? `เหตุผล: ${notes}` : ""}`;

    const notificationData = {
      type: `loan_${status}`,
      borrowerId: borrowerData.id,
      recipient: borrowerData.userId,
      message: message,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("notifications").add(notificationData);
    return { success: true };
  } catch (error) {
    console.error("Failed to send status notification:", error);
    return { success: false, error: error.message };
  }
}

// Enhanced dashboard statistics with comprehensive analytics (Admin only)
app.get("/api/admin/dashboard-stats", authenticateAdmin, async (req, res) => {
  try {
    const { period = "today" } = req.query;

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let startDate = today;
    switch (period) {
    case "week":
      startDate = thisWeek;
      break;
    case "month":
      startDate = thisMonth;
      break;
    case "today":
    default:
      startDate = today;
      break;
    }

    // Get comprehensive statistics
    const [
      totalBorrowersSnap,
      pendingSnap,
      approvedSnap,
      rejectedSnap,
      completedSnap,
      periodApplicationsSnap,
      totalLoanAmountSnap,
      overdueLoanSnap,
      autoApprovedSnap,
      highRiskSnap,
      blacklistSnap
    ] = await Promise.all([
      db.collection("borrowers").get(),
      db.collection("borrowers").where("status", "==", "pending").get(),
      db.collection("borrowers").where("status", "==", "approved").get(),
      db.collection("borrowers").where("status", "==", "rejected").get(),
      db.collection("borrowers").where("status", "==", "completed").get(),
      db.collection("borrowers")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
        .get(),
      db.collection("borrowers")
        .where("status", "in", ["approved", "completed"])
        .get(),
      db.collection("borrowers")
        .where("status", "==", "approved")
        .where("dueDate", "<", admin.firestore.Timestamp.fromDate(now))
        .get(),
      db.collection("borrowers")
        .where("autoApproved", "==", true)
        .get(),
      db.collection("borrowers")
        .where("riskLevel", "==", "high")
        .get(),
      db.collection("blacklist").get()
    ]);

    // Calculate financial metrics
    let totalLoanAmount = 0;
    let totalPaidAmount = 0;
    let totalOverdueAmount = 0;
    let avgCreditScore = 0;
    let totalCreditScore = 0;
    let creditScoreCount = 0;

    const riskDistribution = { low: 0, medium: 0, high: 0, very_high: 0 };
    const statusDistribution = { pending: 0, approved: 0, rejected: 0, completed: 0 };
    const frequencyDistribution = { daily: 0, weekly: 0, monthly: 0 };

    totalLoanAmountSnap.forEach((doc) => {
      const data = doc.data();
      totalLoanAmount += data.totalLoan || 0;
      totalPaidAmount += data.paidAmount || 0;

      if (data.creditScore) {
        totalCreditScore += data.creditScore;
        creditScoreCount++;
      }

      if (data.riskLevel) {
        riskDistribution[data.riskLevel]++;
      }

      if (data.status) {
        statusDistribution[data.status]++;
      }

      if (data.frequency) {
        frequencyDistribution[data.frequency]++;
      }
    });

    overdueLoanSnap.forEach((doc) => {
      const data = doc.data();
      totalOverdueAmount += data.remainingAmount || 0;
    });

    avgCreditScore = creditScoreCount > 0 ? totalCreditScore / creditScoreCount : 0;

    // Calculate rates and percentages
    const totalApplications = totalBorrowersSnap.size;
    const approvalRate = totalApplications > 0 ? (approvedSnap.size / totalApplications * 100) : 0;
    const rejectionRate = totalApplications > 0 ? (rejectedSnap.size / totalApplications * 100) : 0;
    const completionRate = approvedSnap.size > 0 ? (completedSnap.size / approvedSnap.size * 100) : 0;
    const overdueRate = approvedSnap.size > 0 ? (overdueLoanSnap.size / approvedSnap.size * 100) : 0;
    const autoApprovalRate = totalApplications > 0 ? (autoApprovedSnap.size / totalApplications * 100) : 0;
    const collectionRate = totalLoanAmount > 0 ? (totalPaidAmount / totalLoanAmount * 100) : 0;

    // Prepare comprehensive statistics
    const stats = {
      // Basic counts
      totalBorrowers: totalBorrowersSnap.size,
      pendingApplications: pendingSnap.size,
      approvedLoans: approvedSnap.size,
      rejectedApplications: rejectedSnap.size,
      completedLoans: completedSnap.size,
      overdueLoans: overdueLoanSnap.size,
      periodApplications: periodApplicationsSnap.size,
      blacklistedUsers: blacklistSnap.size,

      // Financial metrics
      totalLoanAmount: Math.round(totalLoanAmount),
      totalPaidAmount: Math.round(totalPaidAmount),
      outstandingAmount: Math.round(totalLoanAmount - totalPaidAmount),
      totalOverdueAmount: Math.round(totalOverdueAmount),
      avgLoanAmount: totalApplications > 0 ? Math.round(totalLoanAmount / totalApplications) : 0,

      // Rates and percentages
      approvalRate: Math.round(approvalRate * 100) / 100,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      overdueRate: Math.round(overdueRate * 100) / 100,
      autoApprovalRate: Math.round(autoApprovalRate * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,

      // Risk assessment
      avgCreditScore: Math.round(avgCreditScore),
      riskDistribution: riskDistribution,

      // Distributions
      statusDistribution: statusDistribution,
      frequencyDistribution: frequencyDistribution,

      // Performance indicators
      indicators: {
        portfolioHealth: overdueRate < 5 ? "good" : overdueRate < 10 ? "fair" : "poor",
        collectionPerformance: collectionRate > 90 ? "excellent" : collectionRate > 80 ? "good" : "needs_improvement",
        riskProfile: riskDistribution.high + riskDistribution.very_high < totalApplications * 0.2 ? "conservative" : "aggressive"
      }
    };

    res.json({
      success: true,
      data: stats,
      period: period,
      timestamp: new Date().toISOString(),
      generatedBy: req.admin.id || "admin"
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard statistics",
      message: "ไม่สามารถดึงข้อมูลสถิติได้"
    });
  }
});

// Enhanced blacklist management (Admin only)
app.post("/api/admin/blacklist", authenticateAdmin, async (req, res) => {
  try {
    // Validate input using validation service
    const validation = validationService.validateBlacklist(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.errors
      });
    }

    const { idCard, userId, reason, firstName, lastName } = validation.data;

    // Check if already blacklisted
    const existingQuery = await db.collection("blacklist")
      .where(idCard ? "idCard" : "userId", "==", idCard || userId)
      .get();

    if (!existingQuery.empty) {
      return res.status(409).json({
        error: "Already blacklisted",
        message: "ผู้ใช้นี้อยู่ในบัญชีดำแล้ว"
      });
    }

    const blacklistData = {
      idCard: idCard || null,
      userId: userId || null,
      reason: reason,
      firstName: firstName || "",
      lastName: lastName || "",
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: req.admin.id || "admin",
      isActive: true,
      severity: reason.toLowerCase().includes("fraud") ? "high" : "medium"
    };

    const docRef = await db.collection("blacklist").add(blacklistData);

    // Log blacklist action
    await Promise.all([
      db.collection("adminLogs").add({
        type: "blacklist_add",
        blacklistId: docRef.id,
        targetIdCard: idCard,
        targetUserId: userId,
        targetName: `${firstName} ${lastName}`,
        reason: reason,
        adminId: req.admin.id || "admin",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }),

      securityService.logSecurityEvent("user_blacklisted", {
        blacklistId: docRef.id,
        idCard: idCard,
        userId: userId,
        reason: reason,
        addedBy: req.admin.id || "admin"
      }, req)
    ]);

    console.log("🚫 Added to blacklist:", {
      id: docRef.id,
      idCard: idCard ? `${idCard.substr(0, 4)}-xxxx-xxxx-x${idCard.substr(-1)}` : null,
      userId,
      reason
    });

    res.json({
      success: true,
      message: "เพิ่มเข้าบัญชีดำสำเร็จ",
      data: {
        blacklistId: docRef.id,
        idCard: idCard ? `${idCard.substr(0, 4)}-xxxx-xxxx-x${idCard.substr(-1)}` : null,
        userId: userId,
        name: `${firstName} ${lastName}`,
        reason: reason,
        addedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error adding to blacklist:", error);
    res.status(500).json({
      error: "Failed to add to blacklist",
      message: "ไม่สามารถเพิ่มเข้าบัญชีดำได้"
    });
  }
});

// Get blacklist with pagination and search (Admin only)
app.get("/api/admin/blacklist", authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pagination = validationService.validatePagination(page, limit);

    const query = db.collection("blacklist")
      .where("isActive", "==", true)
      .orderBy("addedAt", "desc")
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);

    const snapshot = await query.get();

    const blacklisted = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Filter by search term if provided
      if (search) {
        const searchTerm = search.toLowerCase();
        const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
        const idCard = data.idCard || "";
        const userId = data.userId || "";

        if (!fullName.includes(searchTerm) &&
                    !idCard.includes(searchTerm) &&
                    !userId.includes(searchTerm)) {
          return;
        }
      }

      blacklisted.push({
        id: doc.id,
        idCard: data.idCard ? `${data.idCard.substr(0, 4)}-xxxx-xxxx-x${data.idCard.substr(-1)}` : null,
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        reason: data.reason,
        severity: data.severity,
        addedAt: data.addedAt?.toDate?.()?.toISOString(),
        addedBy: data.addedBy
      });
    });

    const totalQuery = await db.collection("blacklist").where("isActive", "==", true).get();

    res.json({
      success: true,
      data: blacklisted,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalQuery.size,
        totalPages: Math.ceil(totalQuery.size / pagination.limit)
      }
    });
  } catch (error) {
    console.error("❌ Error fetching blacklist:", error);
    res.status(500).json({
      error: "Failed to fetch blacklist",
      message: "ไม่สามารถดึงข้อมูลบัญชีดำได้"
    });
  }
});

// Remove from blacklist (Admin only)
app.delete("/api/admin/blacklist/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const blacklistRef = db.collection("blacklist").doc(id);
    const blacklistDoc = await blacklistRef.get();

    if (!blacklistDoc.exists) {
      return res.status(404).json({
        error: "Blacklist entry not found",
        message: "ไม่พบข้อมูลในบัญชีดำ"
      });
    }

    const blacklistData = blacklistDoc.data();

    // Soft delete - mark as inactive
    await blacklistRef.update({
      isActive: false,
      removedAt: admin.firestore.FieldValue.serverTimestamp(),
      removedBy: req.admin.id || "admin",
      removalReason: reason || "No reason provided"
    });

    // Log removal action
    await db.collection("adminLogs").add({
      type: "blacklist_remove",
      blacklistId: id,
      targetIdCard: blacklistData.idCard,
      targetUserId: blacklistData.userId,
      targetName: `${blacklistData.firstName} ${blacklistData.lastName}`,
      removalReason: reason,
      adminId: req.admin.id || "admin",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Removed from blacklist:", { id, reason });

    res.json({
      success: true,
      message: "ลบออกจากบัญชีดำสำเร็จ",
      data: {
        blacklistId: id,
        removedAt: new Date().toISOString(),
        reason: reason
      }
    });
  } catch (error) {
    console.error("❌ Error removing from blacklist:", error);
    res.status(500).json({
      error: "Failed to remove from blacklist",
      message: "ไม่สามารถลบออกจากบัญชีดำได้"
    });
  }
});

// Helper Functions for Enhanced Loan Processing

/**
 * เปรียบเทียบข้อมูลที่ผู้ใช้กรอกกับข้อมูลจากทะเบียนราษฎร
 */
function compareUserDataWithGovernmentData(userData, citizenData) {
  const discrepancies = [];

  // เปรียบเทียบชื่อ
  if (userData.firstName.toLowerCase() !== citizenData.firstName.toLowerCase()) {
    discrepancies.push({
      field: "firstName",
      userInput: userData.firstName,
      officialData: citizenData.firstName,
      message: "ชื่อไม่ตรงกับข้อมูลในทะเบียนราษฎร"
    });
  }

  // เปรียบเทียบนามสกุล
  if (userData.lastName.toLowerCase() !== citizenData.lastName.toLowerCase()) {
    discrepancies.push({
      field: "lastName",
      userInput: userData.lastName,
      officialData: citizenData.lastName,
      message: "นามสกุลไม่ตรงกับข้อมูลในทะเบียนราษฎร"
    });
  }

  // เปรียบเทียบวันเกิด
  if (userData.birthDate !== citizenData.birthDate) {
    discrepancies.push({
      field: "birthDate",
      userInput: userData.birthDate,
      officialData: citizenData.birthDate,
      message: "วันเกิดไม่ตรงกับข้อมูลในทะเบียนราษฎร"
    });
  }

  return discrepancies;
}

/**
 * คำนวณเงื่อนไขการกู้เงิน
 */
function calculateLoanTerms(userData, creditAssessment) {
  const baseInterestRate = 0.10; // 10% ต่อปี
  let interestRate = baseInterestRate;

  // ปรับอัตราดอกเบียตามคะแนนเครดิต
  if (creditAssessment.score >= 750) {
    interestRate = 0.08; // 8%
  } else if (creditAssessment.score >= 650) {
    interestRate = 0.09; // 9%
  } else if (creditAssessment.score >= 550) {
    interestRate = 0.12; // 12%
  } else {
    interestRate = 0.15; // 15%
  }

  // คำนวณระยะเวลาผ่อนชำระ
  let termMonths;
  switch (userData.frequency) {
    case "daily":
      termMonths = 1; // 30 วัน
      break;
    case "weekly":
      termMonths = 3; // 12 สัปดาห์
      break;
    case "monthly":
      termMonths = 12; // 12 เดือน
      break;
    default:
      termMonths = 6;
  }

  const principal = userData.amount;
  const totalInterest = principal * interestRate * (termMonths / 12);
  const totalWithInterest = principal + totalInterest;

  // คำนวณงวดการผ่อนชำระ
  let installments;
  let installmentAmount;
  
  switch (userData.frequency) {
    case "daily":
      installments = 30;
      installmentAmount = Math.ceil(totalWithInterest / installments);
      break;
    case "weekly":
      installments = 12;
      installmentAmount = Math.ceil(totalWithInterest / installments);
      break;
    case "monthly":
      installments = termMonths;
      installmentAmount = Math.ceil(totalWithInterest / installments);
      break;
    default:
      installments = 6;
      installmentAmount = Math.ceil(totalWithInterest / installments);
  }

  // คำนวณวันครบกำหนด
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setMonth(today.getMonth() + termMonths);

  return {
    principal: principal,
    interestRate: interestRate,
    termMonths: termMonths,
    totalInterest: totalInterest,
    totalWithInterest: totalWithInterest,
    installments: installments,
    installmentAmount: installmentAmount,
    dueDate: dueDate,
    frequency: userData.frequency
  };
}

/**
 * ตัดสินใจการอนุมัติอัตโนมัติ
 */
function determineAutoApproval(creditAssessment, userData, loanTerms) {
  let autoApproved = false;
  let status = "pending";
  let reason = "";

  // เงื่อนไขการอนุมัติอัตโนมัติ
  if (creditAssessment.score >= 700 && userData.amount <= 10000) {
    autoApproved = true;
    status = "approved";
    reason = "คะแนนเครดิตสูงและจำนวนเงินกู้อยู่ในเกณฑ์ปลอดภัย";
  } else if (creditAssessment.score >= 650 && userData.amount <= 5000) {
    autoApproved = true;
    status = "approved";
    reason = "คะแนนเครดิตดีและจำนวนเงินกู้น้อย";
  } else if (creditAssessment.score < 500) {
    status = "rejected";
    reason = "คะแนนเครดิตต่ำเกินไป";
  } else if (userData.amount > 30000) {
    status = "pending";
    reason = "จำนวนเงินกู้สูง ต้องการการพิจารณาจากเจ้าหน้าที่";
  } else {
    status = "pending";
    reason = "ต้องการการพิจารณาจากเจ้าหน้าที่";
  }

  return {
    autoApproved: autoApproved,
    status: status,
    reason: reason,
    creditScore: creditAssessment.score,
    riskLevel: creditAssessment.riskLevel
  };
}

/**
 * สร้าง record ของผู้กู้เงิน
 */
function createBorrowerRecord(userData, creditAssessment, loanTerms, autoApproval, req, requestId) {
  return {
    // ข้อมูลพื้นฐาน
    userId: userData.userId,
    requestId: requestId,
    
    // ข้อมูลส่วนตัวจากทะเบียนราษฎร
    titleName: userData.titleName,
    firstName: userData.officialFirstName || userData.firstName,
    lastName: userData.officialLastName || userData.lastName,
    birthDate: userData.birthDate,
    idCard: userData.idCard,
    gender: userData.gender,
    nationality: userData.nationality,
    religion: userData.religion,
    
    // ที่อยู่
    address: userData.address, // ที่อยู่ที่กรอก
    officialAddress: userData.officialAddress, // ที่อยู่จากทะเบียนราษฎร
    addressDetails: userData.addressDetails,
    
    // ข้อมูลสินเชื่อ
    amount: userData.amount,
    frequency: userData.frequency,
    loanTerms: loanTerms,
    
    // ประเมินความเสี่ยง
    creditAssessment: creditAssessment,
    creditHistory: userData.creditHistory,
    autoApproval: autoApproval,
    
    // สถานะ
    status: autoApproval.status,
    paid: 0,
    
    // ข้อมูลบัตรประชาชน
    idCardStatus: userData.idCardStatus,
    idCardIssueDate: userData.idCardIssueDate,
    idCardExpiryDate: userData.idCardExpiryDate,
    
    // ข้อมูลระบบ
    dataSource: userData.dataSource,
    verificationTimestamp: userData.verificationTimestamp,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // ข้อมูล Request
    requestInfo: {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * ส่งการแจ้งเตือนการอนุมัติ
 */
async function sendApprovalNotification(userData, loanTerms, borrowerId) {
  try {
    // TODO: ส่งการแจ้งเตือนผ่าน LINE
    console.log(`📧 Sending approval notification for borrower: ${borrowerId}`);
    
    // ในอนาคตจะเพิ่มการส่ง LINE message
    return true;
  } catch (error) {
    console.error("Error sending approval notification:", error);
    return false;
  }
}

// ...existing code...
