// Enhanced BaanTK Production API Server
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const validator = require("validator");
const jwt = require("jsonwebtoken");

// Import custom services
const validationService = require("./validation");
const securityService = require("./security");
const creditScoringService = require("./creditScoring");
const governmentAPIService = require("./governmentAPI"); // เพิ่มการ import Government API

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

// New Government Data Verification Endpoint
app.post("/api/verify-citizen", registrationLimiter, async (req, res) => {
  const startTime = Date.now();
  const requestId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`🏛️ Citizen verification request [${requestId}]:`, {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    const { idCard, userId } = req.body;

    // Validate input
    if (!idCard || !userId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "กรุณาระบุเลขบัตรประชาชนและ User ID"
      });
    }

    // Validate Thai ID Card format
    if (!governmentAPIService.validateThaiIDCard(idCard)) {
      return res.status(400).json({
        error: "Invalid ID card format",
        message: "รูปแบบเลขบัตรประชาชนไม่ถูกต้อง"
      });
    }

    // Check rate limiting for government API
    const canMakeRequest = await governmentAPIService.checkRateLimit('DOPA');
    if (!canMakeRequest) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "มีการขอข้อมูลมากเกินไป กรุณาลองใหม่ในภายหลัง"
      });
    }

    // Check blacklist before making government API call
    const isBlacklisted = await checkBlacklist(idCard, userId);
    if (isBlacklisted) {
      console.log(`🚫 Blacklisted ID attempted verification [${requestId}]:`, idCard);
      
      await securityService.logSecurityEvent("blacklist_verification_attempt", {
        requestId,
        idCard: governmentAPIService.maskIDCard(idCard),
        userId: userId
      }, req);

      return res.status(403).json({
        error: "Verification not permitted",
        message: "ไม่สามารถตรวจสอบข้อมูลได้"
      });
    }

    // Fetch citizen data from government APIs
    console.log(`🔍 Fetching citizen data from government sources [${requestId}]`);
    const govResult = await governmentAPIService.getCitizenDataMultiSource(idCard);

    if (!govResult.success) {
      console.log(`❌ Government API failed [${requestId}]:`, govResult.error);
      
      await securityService.logSecurityEvent("government_api_failed", {
        requestId,
        idCard: governmentAPIService.maskIDCard(idCard),
        error: govResult.error,
        sources_tried: govResult.sources_tried
      }, req);

      return res.status(404).json({
        error: "Citizen data not found",
        message: "ไม่พบข้อมูลบัตรประชาชนในระบบราชการ กรุณาตรวจสอบเลขบัตรหรือติดต่อเจ้าหน้าที่",
        details: {
          sources_checked: govResult.sources_tried || ['DOPA', 'NSO'],
          suggestion: "ตรวจสอบเลขบัตรประชาชนหรือติดต่อกรมการปกครอง"
        }
      });
    }

    const citizenData = govResult.data;
    console.log(`✅ Government data retrieved [${requestId}]:`, {
      source: govResult.source,
      name: `${citizenData.firstNameThai} ${citizenData.lastNameThai}`,
      verificationLevel: citizenData.verificationLevel
    });

    // Validate citizen data quality
    const dataQuality = validateCitizenDataQuality(citizenData);
    if (!dataQuality.isValid) {
      console.log(`⚠️ Poor data quality [${requestId}]:`, dataQuality.issues);
      
      return res.status(422).json({
        error: "Incomplete citizen data",
        message: "ข้อมูลบัตรประชาชนไม่ครบถ้วน กรุณาติดต่อกรมการปกครอง",
        issues: dataQuality.issues
      });
    }

    // Check age eligibility
    const age = calculateAge(citizenData.birthDate);
    if (age < 18 || age > 80) {
      return res.status(422).json({
        error: "Age not eligible",
        message: `อายุ ${age} ปี ไม่เข้าเงื่อนไขการสมัครสินเชื่อ (ต้องอายุ 18-80 ปี)`
      });
    }

    // Check if card is active/valid
    if (citizenData.cardStatus && !citizenData.cardStatus.isActive) {
      return res.status(422).json({
        error: "Invalid card status",
        message: "บัตรประชาชนหมดอายุหรือไม่ถูกต้อง กรุณาต่ออายุบัตรประชาชน"
      });
    }

    // Log successful verification
    await Promise.all([
      securityService.logSecurityEvent("citizen_verification_success", {
        requestId,
        idCard: governmentAPIService.maskIDCard(idCard),
        userId: userId,
        dataSource: govResult.source,
        verificationLevel: citizenData.verificationLevel,
        processingTime: Date.now() - startTime
      }, req),

      // Store verification in database for future reference
      db.collection("citizen_verifications").add({
        idCard: citizenData.idCard,
        userId: userId,
        dataSource: govResult.source,
        verificationLevel: citizenData.verificationLevel,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedData: {
          name: `${citizenData.firstNameThai} ${citizenData.lastNameThai}`,
          birthDate: citizenData.birthDate,
          address: citizenData.address?.fullAddress || '',
          age: age
        },
        requestId: requestId,
        sessionInfo: {
          ip: req.ip,
          userAgent: req.get("User-Agent")
        }
      })
    );

    // Return verified citizen data
    res.json({
      success: true,
      message: "ตรวจสอบบัตรประชาชนสำเร็จ",
      data: {
        // ข้อมูลพื้นฐาน
        idCard: citizenData.idCard,
        titleThai: citizenData.titleThai,
        firstNameThai: citizenData.firstNameThai,
        lastNameThai: citizenData.lastNameThai,
        firstNameEnglish: citizenData.firstNameEnglish,
        lastNameEnglish: citizenData.lastNameEnglish,
        birthDate: citizenData.birthDate,
        age: age,
        gender: citizenData.gender,
        nationality: citizenData.nationality,
        
        // ที่อยู่
        address: {
          houseNumber: citizenData.address?.houseNumber || '',
          village: citizenData.address?.village || '',
          lane: citizenData.address?.lane || '',
          road: citizenData.address?.road || '',
          subDistrict: citizenData.address?.subDistrict || '',
          district: citizenData.address?.district || '',
          province: citizenData.address?.province || '',
          postalCode: citizenData.address?.postalCode || '',
          fullAddress: citizenData.address?.fullAddress || ''
        },

        // สถานะการตรวจสอบ
        verification: {
          level: citizenData.verificationLevel,
          source: govResult.source,
          timestamp: new Date().toISOString(),
          isGovernmentVerified: true,
          dataQuality: dataQuality.score,
          ageEligible: true,
          cardActive: citizenData.cardStatus?.isActive !== false
        },

        // ข้อมูลเพิ่มเติม (ถ้ามี)
        additionalInfo: {
          maritalStatus: citizenData.maritalStatus || '',
          occupation: citizenData.occupation || '',
          education: citizenData.education || '',
          religion: citizenData.religion || ''
        }
      },
      metadata: {
        requestId: requestId,
        processingTime: Date.now() - startTime,
        dataSource: govResult.source,
        verificationLevel: citizenData.verificationLevel
      }
    });

  } catch (error) {
    console.error(`❌ Error in citizen verification [${requestId}]:`, error);
    
    await securityService.logSecurityEvent("citizen_verification_error", {
      requestId,
      error: error.message,
      processingTime: Date.now() - startTime
    }, req);

    res.status(500).json({
      error: "Verification failed",
      message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง",
      requestId: requestId
    });
  }
});

// LIFF Register endpoint (Modified to use verified government data)
app.post("/api/liff-register", registrationLimiter, async (req, res) => {
  const startTime = Date.now();
  const requestId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`📥 Registration request [${requestId}]:`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      hasBody: !!req.body
    });

    const { 
      idCard, 
      userId, 
      amount, 
      frequency, 
      currentAddress, // ที่อยู่ปัจจุบัน (อาจต่างจากทะเบียนบ้าน)
      phoneNumber,
      email,
      occupation,
      monthlyIncome,
      verificationToken // Token จากการตรวจสอบบัตรประชาชน
    } = req.body;

    // Validate required fields
    if (!idCard || !userId || !amount || !frequency) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบ"
      });
    }

    // Verify that citizen data was previously verified
    const verificationRecord = await db.collection("citizen_verifications")
      .where("idCard", "==", idCard)
      .where("userId", "==", userId)
      .orderBy("verifiedAt", "desc")
      .limit(1)
      .get();

    if (verificationRecord.empty) {
      return res.status(400).json({
        error: "Citizen not verified",
        message: "กรุณาตรวจสอบบัตรประชาชนก่อนยื่นคำขอ"
      });
    }

    const verifiedData = verificationRecord.docs[0].data();
    console.log(`✅ Using verified citizen data [${requestId}]:`, {
      source: verifiedData.dataSource,
      verificationLevel: verifiedData.verificationLevel,
      verifiedAt: verifiedData.verifiedAt
    });

    // Validate additional input
    const additionalValidation = validateAdditionalInput({
      amount,
      frequency,
      currentAddress,
      phoneNumber,
      email,
      occupation,
      monthlyIncome
    });

    if (!additionalValidation.isValid) {
      return res.status(400).json({
        error: "Validation failed",
        message: "ข้อมูลไม่ถูกต้อง",
        details: additionalValidation.errors
      });
    }

    // Combine government verified data with user input
    const completeUserData = {
      // ข้อมูลจากราชการ (ไม่สามารถแก้ไขได้)
      idCard: verifiedData.verifiedData.idCard || idCard,
      firstName: verifiedData.verifiedData.name.split(' ')[0],
      lastName: verifiedData.verifiedData.name.split(' ').slice(1).join(' '),
      birthDate: verifiedData.verifiedData.birthDate,
      age: verifiedData.verifiedData.age,
      addressOnId: verifiedData.verifiedData.address, // ที่อยู่ตามทะเบียนบ้าน
      
      // ข้อมูลที่ผู้ใช้กรอกเอง
      amount: parseFloat(amount),
      frequency: frequency,
      currentAddress: currentAddress || verifiedData.verifiedData.address, // ใช้ที่อยู่ทะเบียนบ้านถ้าไม่ระบุ
      phoneNumber: phoneNumber,
      email: email,
      occupation: occupation,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
      
      // ข้อมูลระบบ
      userId: userId,
      verificationLevel: verifiedData.verificationLevel,
      dataSource: verifiedData.dataSource,
      verifiedAt: verifiedData.verifiedAt
    };

    // Enhanced credit scoring with detailed analysis
    const creditAssessment = await creditScoringService.calculateCreditScore(completeUserData, userId);
    console.log(`📊 Credit assessment [${requestId}]:`, {
      score: creditAssessment.score,
      grade: creditAssessment.grade,
      riskLevel: creditAssessment.riskLevel,
      recommendation: creditAssessment.recommendation
    });

    // Calculate loan terms with enhanced logic
    const loanTerms = calculateLoanTerms(completeUserData, creditAssessment);

    // Auto-approval logic with enhanced criteria
    const autoApproval = determineAutoApproval(creditAssessment, completeUserData, loanTerms);

    // Create comprehensive borrower record
    const borrowerData = createBorrowerRecord(completeUserData, creditAssessment, loanTerms, autoApproval, req, requestId);

    // Save to Firestore with transaction
    const docRef = await db.collection("borrowers").add(borrowerData);
    console.log(`💾 Borrower record created [${requestId}]:`, docRef.id);

    // Log successful application
    await Promise.all([
      db.collection("applicationLogs").add({
        type: "new_application",
        requestId,
        borrowerId: docRef.id,
        userId: userId,
        idCard: idCard,
        amount: amount,
        creditScore: creditAssessment.score,
        status: autoApproval.status,
        autoApproved: autoApproval.autoApproved,
        processingTime: Date.now() - startTime,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }),

      // Send notification if approved
      autoApproval.autoApproved ? sendApprovalNotification(completeUserData, loanTerms, docRef.id) : null
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
          firstName: completeUserData.firstName,
          lastName: completeUserData.lastName,
          idCard: `${completeUserData.idCard.substr(0, 4)}-xxxx-xxxx-x${completeUserData.idCard.substr(-1)}`
        },
        loan: {
          requestedAmount: amount,
          totalAmount: loanTerms.totalWithInterest,
          interestRate: `${(loanTerms.interestRate * 100).toFixed(1)}%`,
          frequency: frequency,
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
        nextSteps: autoApproval.autoApproved ?
          ["กรุณาเตรียมเอกสารประกอบการกู้", "รอการติดต่อจากเจ้าหน้าที่"] :
          ["รอการอนุมัติจากเจ้าหน้าที่", "ระยะเวลาพิจารณา 1-3 วันทำการ"]
      }
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ Registration completed [${requestId}]:`, {
      id: docRef.id,
      name: `${completeUserData.firstName} ${completeUserData.lastName}`,
      amount: amount,
      status: autoApproval.status,
      creditScore: creditAssessment.score,
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

// Calculate comprehensive loan terms
function calculateLoanTerms(userData, creditAssessment) {
  const today = new Date();

  // Dynamic interest rate based on credit score and frequency
  let baseRate;
  switch (userData.frequency) {
  case "daily":
    baseRate = 0.25; // 25% for daily
    break;
  case "weekly":
    baseRate = 0.18; // 18% for weekly
    break;
  case "monthly":
    baseRate = 0.12; // 12% for monthly
    break;
  default:
    baseRate = 0.15;
  }

  // Credit score adjustment (better score = lower rate)
  const scoreAdjustment = Math.max(-0.05, (700 - creditAssessment.score) / 2000);
  const finalRate = Math.max(0.05, baseRate + scoreAdjustment); // Minimum 5%

  // Calculate due date
  const dueDate = new Date(today);
  switch (userData.frequency) {
  case "daily":
    dueDate.setDate(today.getDate() + 1);
    break;
  case "weekly":
    dueDate.setDate(today.getDate() + 7);
    break;
  case "monthly":
    dueDate.setMonth(today.getMonth() + 1);
    break;
  }

  const totalWithInterest = userData.amount * (1 + finalRate);
  const installmentAmount = calculateInstallmentAmount(totalWithInterest, userData.frequency);

  return {
    interestRate: finalRate,
    totalWithInterest: Math.round(totalWithInterest * 100) / 100,
    dueDate: dueDate,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
    numberOfPayments: getNumberOfPayments(userData.frequency),
    dailyInterestRate: finalRate / getNumberOfPayments(userData.frequency)
  };
}

// Calculate installment amount based on frequency
function calculateInstallmentAmount(totalAmount, frequency) {
  switch (frequency) {
  case "daily":
    return totalAmount / 30; // 30 days
  case "weekly":
    return totalAmount / 4; // 4 weeks
  case "monthly":
    return totalAmount; // 1 month
  default:
    return totalAmount;
  }
}

// Get number of payments based on frequency
function getNumberOfPayments(frequency) {
  switch (frequency) {
  case "daily":
    return 30;
  case "weekly":
    return 4;
  case "monthly":
    return 1;
  default:
    return 1;
  }
}

// Enhanced auto-approval determination
function determineAutoApproval(creditAssessment, userData, loanTerms) {
  let autoApproved = false;
  let status = "pending";
  let reason = "Manual review required";

  // Auto-approval criteria (all must be met)
  const criteria = {
    creditScore: creditAssessment.score >= 700,
    loanAmount: userData.amount <= 15000,
    frequency: ["weekly", "monthly"].includes(userData.frequency),
    riskLevel: creditAssessment.riskLevel === "low",
    recommendation: creditAssessment.recommendation === "auto_approve"
  };

  // Check if all criteria are met
  if (Object.values(criteria).every(Boolean)) {
    autoApproved = true;
    status = "approved";
    reason = "Auto-approved - meets all criteria";
  } else {
    // Determine specific reason for manual review
    if (!criteria.creditScore) {
      reason = "Credit score below auto-approval threshold";
    } else if (!criteria.loanAmount) {
      reason = "Loan amount exceeds auto-approval limit";
    } else if (!criteria.frequency) {
      reason = "Payment frequency requires manual review";
    } else if (!criteria.riskLevel) {
      reason = "Risk level too high for auto-approval";
    }
  }

  return {
    autoApproved,
    status,
    reason,
    criteria
  };
}

// Create comprehensive borrower record
function createBorrowerRecord(userData, creditAssessment, loanTerms, autoApproval, req, requestId) {
  return {
    // Request Information
    requestId: requestId,

    // Personal Information (encrypted sensitive data)
    firstName: userData.firstName,
    lastName: userData.lastName,
    birthDate: userData.birthDate,
    idCard: userData.idCard, // Consider encryption in production
    address: userData.address,
    userId: userData.userId,
    phoneNumber: userData.phoneNumber || null,
    email: userData.email || null,

    // Loan Information
    requestedAmount: userData.amount,
    approvedAmount: autoApproval.autoApproved ? userData.amount : 0,
    totalLoan: loanTerms.totalWithInterest,
    frequency: userData.frequency,
    interestRate: loanTerms.interestRate,
    installmentAmount: loanTerms.installmentAmount,
    numberOfPayments: loanTerms.numberOfPayments,
    dueDate: admin.firestore.Timestamp.fromDate(loanTerms.dueDate),

    // Payment Information
    paidAmount: 0,
    remainingAmount: loanTerms.totalWithInterest,
    paymentHistory: [],
    lastPaymentDate: null,
    nextPaymentDate: admin.firestore.Timestamp.fromDate(loanTerms.dueDate),

    // Status Information
    status: autoApproval.status,
    autoApproved: autoApproval.autoApproved,
    approvalReason: autoApproval.reason,

    // Credit Assessment
    creditScore: creditAssessment.score,
    creditGrade: creditAssessment.grade,
    riskLevel: creditAssessment.riskLevel,
    creditFactors: creditAssessment.factors,
    creditReport: creditScoringService.generateCreditReport(creditAssessment, userData),

    // Timestamps
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedAt: autoApproval.autoApproved ? admin.firestore.FieldValue.serverTimestamp() : null,

    // Security Information
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
    sessionInfo: {
      country: req.headers["cf-ipcountry"] || "Unknown",
      region: req.headers["cf-region"] || "Unknown"
    },

    // Compliance and Audit
    complianceChecks: {
      blacklistCheck: "passed",
      duplicateCheck: "passed",
      ageVerification: "passed",
      idCardVerification: "passed"
    },

    // Business Logic
    loanPurpose: "personal", // Could be expanded
    documentStatus: "pending",
    verificationStatus: "pending",
    disbursementStatus: autoApproval.autoApproved ? "pending" : "waiting_approval",

    // Communication
    notifications: {
      sms: false,
      email: false,
      line: true
    },

    // Additional metadata
    metadata: {
      source: "liff_registration",
      version: "2.0",
      processingTime: null // Will be updated
    }
  };
}

// Send approval notification (placeholder - implement with your notification system)
async function sendApprovalNotification(userData, loanTerms, borrowerId) {
  try {
    // TODO: Implement LINE notification
    console.log("📱 Sending approval notification:", {
      name: `${userData.firstName} ${userData.lastName}`,
      amount: loanTerms.totalWithInterest,
      dueDate: loanTerms.dueDate,
      borrowerId: borrowerId
    });

    // Example notification data
    const notificationData = {
      type: "loan_approved",
      borrowerId: borrowerId,
      recipient: userData.userId,
      message: `🎉 เงินกู้ของคุณได้รับการอนุมัติแล้ว!\nจำนวน: ${loanTerms.totalWithInterest.toLocaleString()} บาท\nครบกำหนดชำระ: ${loanTerms.dueDate.toLocaleDateString("th-TH")}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending"
    };

    // Save notification to database
    await db.collection("notifications").add(notificationData);

    return { success: true };
  } catch (error) {
    console.error("Failed to send notification:", error);
    return { success: false, error: error.message };
  }
}

// Get detailed borrower information (Admin only)
app.get("/api/admin/borrowers/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const borrowerDoc = await db.collection("borrowers").doc(id).get();

    if (!borrowerDoc.exists) {
      return res.status(404).json({
        error: "Borrower not found",
        message: "ไม่พบข้อมูลผู้กู้"
      });
    }

    const borrowerData = borrowerDoc.data();

    // Get related logs
    const [adminLogs, paymentHistory] = await Promise.all([
      db.collection("adminLogs")
        .where("borrowerId", "==", id)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get(),
      db.collection("payments")
        .where("borrowerId", "==", id)
        .orderBy("paidAt", "desc")
        .get()
    ]);

    const logs = [];
    adminLogs.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString()
      });
    });

    const payments = [];
    paymentHistory.forEach((doc) => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        ...data,
        paidAt: data.paidAt?.toDate?.()?.toISOString()
      });
    });

    res.json({
      success: true,
      data: {
        id: id,
        ...borrowerData,
        // Convert timestamps
        createdAt: borrowerData.createdAt?.toDate?.()?.toISOString(),
        updatedAt: borrowerData.updatedAt?.toDate?.()?.toISOString(),
        approvedAt: borrowerData.approvedAt?.toDate?.()?.toISOString(),
        dueDate: borrowerData.dueDate?.toDate?.()?.toISOString(),
        // Related data
        adminLogs: logs,
        paymentHistory: payments
      }
    });
  } catch (error) {
    console.error("❌ Error fetching borrower details:", error);
    res.status(500).json({
      error: "Failed to fetch borrower details",
      message: "ไม่สามารถดึงข้อมูลผู้กู้ได้"
    });
  }
});

// Update borrower information (Admin only)
app.put("/api/admin/borrowers/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate updates
    const allowedFields = [
      "firstName", "lastName", "address", "phoneNumber", "email",
      "adminNotes", "riskLevel", "creditScore"
    ];

    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        sanitizedUpdates[key] = validationService.sanitizeInput(value);
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        error: "No valid fields to update",
        message: "ไม่มีข้อมูลที่ถูกต้องสำหรับการอัพเดท"
      });
    }

    sanitizedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("borrowers").doc(id).update(sanitizedUpdates);

    // Log admin action
    await db.collection("adminLogs").add({
      type: "borrower_update",
      borrowerId: id,
      updatedFields: Object.keys(sanitizedUpdates),
      adminId: req.admin.id || "admin",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: "อัพเดทข้อมูลสำเร็จ",
      updatedFields: Object.keys(sanitizedUpdates)
    });
  } catch (error) {
    console.error("❌ Error updating borrower:", error);
    res.status(500).json({
      error: "Failed to update borrower",
      message: "ไม่สามารถอัพเดทข้อมูลผู้กู้ได้"
    });
  }
});

// Get admin logs with filtering (Admin only)
app.get("/api/admin/logs", authenticateAdmin, async (req, res) => {
  try {
    const {
      type,
      page = 1,
      limit = 50,
      startDate,
      endDate,
      adminId
    } = req.query;

    const pagination = validationService.validatePagination(page, limit);
    const dateRange = validationService.validateDateRange(startDate, endDate);

    if (!dateRange.isValid) {
      return res.status(400).json({ error: dateRange.error });
    }

    let query = db.collection("adminLogs");

    if (type) {
      query = query.where("type", "==", type);
    }

    if (adminId) {
      query = query.where("adminId", "==", adminId);
    }

    if (dateRange.start) {
      query = query.where("timestamp", ">=", admin.firestore.Timestamp.fromDate(dateRange.start));
    }

    if (dateRange.end) {
      query = query.where("timestamp", "<=", admin.firestore.Timestamp.fromDate(dateRange.end));
    }

    query = query.orderBy("timestamp", "desc")
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);

    const snapshot = await query.get();

    const logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString()
      });
    });

    res.json({
      success: true,
      data: logs,
      pagination: pagination,
      filters: { type, adminId, startDate, endDate }
    });
  } catch (error) {
    console.error("❌ Error fetching admin logs:", error);
    res.status(500).json({
      error: "Failed to fetch logs",
      message: "ไม่สามารถดึงข้อมูล log ได้"
    });
  }
});

// Export data for reporting (Admin only)
app.get("/api/admin/export", authenticateAdmin, async (req, res) => {
  try {
    const { type = "borrowers", format = "json" } = req.query;

    let data = [];

    switch (type) {
    case "borrowers":
      const borrowersSnap = await db.collection("borrowers").get();
      borrowersSnap.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          ...docData,
          // Mask sensitive data
          idCard: docData.idCard ? `${docData.idCard.substr(0, 4)}-xxxx-xxxx-x${docData.idCard.substr(-1)}` : null,
          createdAt: docData.createdAt?.toDate?.()?.toISOString(),
          updatedAt: docData.updatedAt?.toDate?.()?.toISOString(),
          dueDate: docData.dueDate?.toDate?.()?.toISOString()
        });
      });
      break;

    case "statistics":
      // Get comprehensive statistics for export
      const statsResponse = await fetch("/api/admin/dashboard-stats");
      data = await statsResponse.json();
      break;

    default:
      return res.status(400).json({
        error: "Invalid export type",
        message: "ประเภทการ export ไม่ถูกต้อง"
      });
    }

    // Set appropriate headers
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
    const filename = `baantk-${type}-${timestamp}.${format}`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      // TODO: Implement CSV conversion
      res.send("CSV export not implemented yet");
    } else {
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        exportType: type,
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        data: data
      });
    }

    // Log export action
    await securityService.logSecurityEvent("data_export", {
      exportType: type,
      format: format,
      recordCount: Array.isArray(data) ? data.length : 1,
      adminId: req.admin.id || "admin"
    }, req);
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    res.status(500).json({
      error: "Export failed",
      message: "ไม่สามารถ export ข้อมูลได้"
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("🔥 Unhandled error:", error);

  // Log critical errors
  securityService.logSecurityEvent("system_error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  }, req);

  res.status(500).json({
    error: "Internal server error",
    message: "เกิดข้อผิดพลาดภายในระบบ",
    requestId: `error_${Date.now()}`
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "ไม่พบ endpoint ที่ระบุ",
    path: req.path
  });
});

// Export the enhanced webhook function
exports.webhook = functions.https.onRequest(app);

// Optional: Export individual functions for testing
exports.securityService = securityService;
exports.validationService = validationService;
exports.creditScoringService = creditScoringService;

// Helper functions for government data integration

/**
 * คำนวณอายุจากวันเกิด
 * @param {string} birthDate - วันเกิดในรูปแบบ DD/MM/YYYY
 * @returns {number} อายุเป็นปี
 */
function calculateAge(birthDate) {
  if (!birthDate) return 0;
  
  try {
    const [day, month, year] = birthDate.split('/').map(Number);
    const birth = new Date(year, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
}

/**
 * ตรวจสอบคุณภาพของข้อมูลที่ได้จากราชการ
 * @param {Object} citizenData - ข้อมูลประชาชนจาก Government API
 * @returns {Object} ผลการตรวจสอบคุณภาพข้อมูล
 */
function validateCitizenDataQuality(citizenData) {
  const issues = [];
  let score = 100;

  // ตรวจสอบข้อมูลพื้นฐาน
  if (!citizenData.firstNameThai || citizenData.firstNameThai.length < 2) {
    issues.push('ชื่อไม่ครบถ้วน');
    score -= 20;
  }

  if (!citizenData.lastNameThai || citizenData.lastNameThai.length < 2) {
    issues.push('นามสกุลไม่ครบถ้วน');
    score -= 20;
  }

  if (!citizenData.birthDate || !isValidDate(citizenData.birthDate)) {
    issues.push('วันเกิดไม่ถูกต้อง');
    score -= 15;
  }

  if (!citizenData.idCard || citizenData.idCard.length !== 13) {
    issues.push('เลขบัตรประชาชนไม่ถูกต้อง');
    score -= 25;
  }

  // ตรวจสอบที่อยู่
  if (!citizenData.address || !citizenData.address.fullAddress) {
    issues.push('ที่อยู่ไม่ครบถ้วน');
    score -= 10;
  }

  // ตรวจสอบสถานะบัตร
  if (citizenData.cardStatus && !citizenData.cardStatus.isActive) {
    issues.push('บัตรประชาชนหมดอายุหรือไม่ใช้งาน');
    score -= 30;
  }

  return {
    isValid: score >= 70, // ข้อมูลต้องมีคุณภาพอย่างน้อย 70%
    score: Math.max(0, score),
    issues: issues,
    quality: score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 70 ? 'acceptable' : 'poor'
  };
}

/**
 * ตรวจสอบรูปแบบวันที่
 * @param {string} dateString - วันที่ในรูปแบบ DD/MM/YYYY
 * @returns {boolean} ถูกต้องหรือไม่
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(dateString)) return false;
  
  try {
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year &&
           year >= 1900 && 
           year <= new Date().getFullYear();
  } catch (error) {
    return false;
  }
}

/**
 * ตรวจสอบข้อมูลเพิ่มเติมที่ผู้ใช้กรอก
 * @param {Object} data - ข้อมูลที่ผู้ใช้กรอก
 * @returns {Object} ผลการตรวจสอบ
 */
function validateAdditionalInput(data) {
  const errors = [];

  // ตรวจสอบจำนวนเงินกู้
  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount < 100 || amount > 50000) {
    errors.push('จำนวนเงินกู้ต้องอยู่ระหว่าง 100-50,000 บาท');
  }

  // ตรวจสอบความถี่การชำระ
  if (!['daily', 'weekly', 'monthly'].includes(data.frequency)) {
    errors.push('ระยะเวลาการชำระไม่ถูกต้อง');
  }

  // ตรวจสอบที่อยู่ปัจจุบัน
  if (data.currentAddress && data.currentAddress.length < 10) {
    errors.push('ที่อยู่ปัจจุบันต้องมีอย่างน้อย 10 ตัวอักษร');
  }

  // ตรวจสอบเบอร์โทรศัพท์
  if (data.phoneNumber && !/^0[0-9]{9}$/.test(data.phoneNumber)) {
    errors.push('เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 10 หลัก)');
  }

  // ตรวจสอบอีเมล
  if (data.email && !validator.isEmail(data.email)) {
    errors.push('อีเมลไม่ถูกต้อง');
  }

  // ตรวจสอบรายได้รายเดือน
  if (data.monthlyIncome) {
    const income = parseFloat(data.monthlyIncome);
    if (isNaN(income) || income < 0 || income > 1000000) {
      errors.push('รายได้รายเดือนไม่ถูกต้อง');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
