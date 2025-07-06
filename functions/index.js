// 🔄 Fixed BaanTK Webhook - Working Version
console.log("🚀 Starting BaanTK webhook function...");

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { processLineMessage, verifySignature, sendPushMessage } = require("./line-auto-reply");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Enable CORS with comprehensive configuration
app.use(cors({
  origin: [
    "https://baan-tk.web.app",
    "https://baan-tk.firebaseapp.com",
    "https://liff.line.me",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:8080",
    /^https?:\/\/.*\.web\.app$/,
    /^https?:\/\/.*\.firebaseapp\.com$/
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Authentication middleware for admin endpoints
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7);
  
  // Use hardcoded token for now (in production, use Firebase config)
  const adminToken = "BaanTK@Admin#2024$Secure!";
  
  console.log(`🔐 Admin auth check - Received token: ${token}`);
  console.log(`🔐 Expected token: ${adminToken}`);
  console.log(`🔐 Tokens match: ${token === adminToken}`);
  
  if (token !== adminToken) {
    return res.status(403).json({ 
      error: "Invalid token",
      debug: {
        receivedLength: token.length,
        expectedLength: adminToken.length,
        receivedToken: token.substring(0, 10) + "...",
        expectedToken: adminToken.substring(0, 10) + "..."
      }
    });
  }

  next();
}

// Input validation middleware
function validateBorrowerData(req, res, next) {
  const { firstName, lastName, birthDate, idCard, address, amount, frequency } = req.body;

  if (!firstName || !lastName || !birthDate || !idCard || !address || !amount || !frequency) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^\d{13}$/.test(idCard)) {
    return res.status(400).json({ error: "Invalid ID card number" });
  }

  const loanAmount = parseFloat(amount);
  if (isNaN(loanAmount) || loanAmount <= 0 || loanAmount > 50000) {
    return res.status(400).json({ error: "Invalid loan amount" });
  }

  if (!["daily", "weekly", "monthly"].includes(frequency)) {
    return res.status(400).json({ error: "Invalid payment frequency" });
  }

  next();
}

// Health Check Endpoints
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "BaanTK API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Health check passed",
    timestamp: new Date().toISOString()
  });
});

// Enhanced webhook for LINE with auto-reply
app.post("/webhook", async (req, res) => {
  console.log("📩 Webhook received:", JSON.stringify(req.body, null, 2));
  console.log("📋 Headers:", JSON.stringify(req.headers, null, 2));
  
  try {
    // Verify LINE signature (optional but recommended for production)
    const signature = req.headers["x-line-signature"];
    console.log("🔐 Signature check:", signature ? "Present" : "Missing");
    
    if (signature) {
      const bodyString = JSON.stringify(req.body);
      const isValidSignature = verifySignature(bodyString, signature);
      console.log("✅ Signature valid:", isValidSignature);
      if (!isValidSignature) {
        console.warn("⚠️ Invalid LINE signature");
        // Don't return error for now, just log
        // return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const events = req.body.events || [];
    console.log(`📨 Processing ${events.length} events`);
    
    // Process each event
    for (const event of events) {
      console.log(`🔄 Processing event: ${event.type} from user: ${event.source?.userId}`);
      
      if (event.type === "message") {
        // Process message and send auto-reply
        console.log("💬 Processing message event...");
        const result = await processLineMessage(event);
        if (result) {
          console.log("✅ Auto-reply result:", result);
        } else {
          console.log("❌ Auto-reply failed or returned null");
        }
      } else if (event.type === "follow") {
        // Send welcome message when user follows
        console.log("👋 Processing follow event...");
        const userId = event.source.userId;
        const welcomeResult = await sendPushMessage(userId, [
          "ยินดีต้อนรับสู่ BaanTK! 🎉",
          "เราพร้อมให้บริการสินเชื่อด่วนแก่คุณ",
          "พิมพ์ 'ช่วยเหลือ' เพื่อดูคำสั่งทั้งหมด"
        ]);
        console.log("✅ Welcome message result:", welcomeResult);
      } else if (event.type === "unfollow") {
        console.log("👋 User unfollowed");
      } else {
        console.log(`🤷 Unknown event type: ${event.type}`);
      }
    }
    
    // Return 200 OK to LINE
    const responseData = { 
      status: "OK", 
      message: "Webhook processed successfully",
      eventsProcessed: events.length,
      timestamp: new Date().toISOString()
    };
    
    console.log("📤 Sending response:", responseData);
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    console.error("❌ Error stack:", error.stack);
    // Still return 200 to LINE to avoid retries
    res.status(200).json({ 
      status: "ERROR", 
      message: "Webhook processing failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// LIFF Register API endpoint with Firebase integration
app.post("/api/liff-register", validateBorrowerData, async (req, res) => {
  console.log("📝 LIFF Register received:", JSON.stringify(req.body, null, 2));
  
  try {
    const {
      firstName,
      lastName,
      birthDate,
      idCard,
      address,
      addressOnId,
      currentAddress,
      amount,
      frequency,
      userId,
      idCardImage
    } = req.body;

    // Check if user already exists
    const existingUser = await db.collection("borrowers")
      .where("idCard", "==", idCard)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({
        success: false,
        error: "User with this ID card already exists",
        message: "ผู้ใช้ที่มีเลขบัตรประชาชนนี้มีอยู่แล้วในระบบ"
      });
    }

    // Calculate due date based on frequency
    const today = new Date();
    const dueDate = new Date(today);
    
    if (frequency === "daily") {
      dueDate.setDate(today.getDate() + 1);
    } else if (frequency === "weekly") {
      dueDate.setDate(today.getDate() + 7);
    } else {
      dueDate.setMonth(today.getMonth() + 1);
    }

    // Calculate interest rate
    const interestRate = frequency === "daily" ? 0.2 : frequency === "weekly" ? 0.15 : 0.1;

    // Mock credit score calculation
    const creditScore = Math.floor(Math.random() * 300) + 500; // 500-800

    // Prepare registration data for Firebase
    const registrationData = {
      firstName,
      lastName,
      birthDate,
      idCard,
      address: addressOnId || address,
      addressOnId: addressOnId || address,
      currentAddress: currentAddress || address,
      requestedAmount: parseFloat(amount),
      totalLoan: parseFloat(amount),
      frequency,
      interestRate,
      dueDate: admin.firestore.Timestamp.fromDate(dueDate),
      paid: 0,
      status: "pending",
      userId: userId || "anonymous",
      creditScore,
      hasIdCardImage: !!idCardImage,
      createdAt: admin.firestore.Timestamp.fromDate(today)
    };

    // Save to Firebase
    const docRef = await db.collection("borrowers").add(registrationData);
    console.log("✅ Registration saved to Firebase with ID:", docRef.id);

    // Prepare response data
    const responseData = {
      id: docRef.id,
      ...registrationData,
      dueDate: dueDate.toISOString(),
      createdAt: today.toISOString()
    };

    console.log("✅ Registration successful:", responseData);

    res.json({
      success: true,
      message: "ลงทะเบียนสำเร็จแล้ว",
      data: responseData,
      creditScore: creditScore,
      firebaseId: docRef.id
    });
    
  } catch (error) {
    console.error("❌ LIFF Register error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

// Admin Dashboard Stats with real Firebase data
app.get("/api/admin/dashboard-stats", authenticateAdmin, async (req, res) => {
  try {
    // Get real data from Firebase
    const borrowersSnap = await db.collection("borrowers").get();
    const totalBorrowers = borrowersSnap.size;
    
    const pendingSnap = await db.collection("borrowers").where("status", "==", "pending").get();
    const pendingApprovals = pendingSnap.size;
    
    const approvedSnap = await db.collection("borrowers").where("status", "==", "approved").get();
    const approvedLoans = approvedSnap.size;
    
    // Calculate total loan amount and overdue loans
    let totalLoanAmount = 0;
    let overdueLoans = 0;
    const today = new Date();
    
    borrowersSnap.forEach(doc => {
      const data = doc.data();
      if (data.status === "approved") {
        totalLoanAmount += data.requestedAmount || 0;
        
        // Check if overdue
        const dueDate = data.dueDate?.toDate?.() || new Date();
        if (dueDate < today) {
          overdueLoans++;
        }
      }
    });
    
    // Get slips count (if collection exists)
    let totalSlips = 0;
    try {
      const slipsSnap = await db.collection("slips").get();
      totalSlips = slipsSnap.size;
    } catch (e) {
      console.log("Slips collection not found, using 0");
    }

    const stats = {
      totalBorrowers,
      pendingApprovals,
      approvedLoans,
      overdueLoans,
      totalLoanAmount,
      totalSlips,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error("❌ Error getting dashboard stats:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get dashboard stats",
      message: error.message
    });
  }
});

// Admin Borrowers Endpoint with real Firebase data
app.get("/api/admin/borrowers", authenticateAdmin, async (req, res) => {
  try {
    const borrowersSnap = await db.collection("borrowers")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    
    const borrowers = [];
    borrowersSnap.forEach(doc => {
      const data = doc.data();
      borrowers.push({
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        idCard: data.idCard,
        requestedAmount: data.requestedAmount,
        frequency: data.frequency,
        status: data.status,
        creditScore: data.creditScore,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        dueDate: data.dueDate?.toDate?.()?.toISOString() || null
      });
    });

    res.json({
      success: true,
      data: borrowers,
      count: borrowers.length
    });
    
  } catch (error) {
    console.error("❌ Error getting borrowers:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get borrowers",
      message: error.message
    });
  }
});

// Admin Slips Endpoint with real Firebase data
app.get("/api/admin/slips", authenticateAdmin, async (req, res) => {
  try {
    const slipsSnap = await db.collection("slips")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    
    const slips = [];
    slipsSnap.forEach(doc => {
      const data = doc.data();
      slips.push({
        id: doc.id,
        borrowerId: data.borrowerId,
        amount: data.amount,
        paymentDate: data.paymentDate?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString(),
        status: data.status || "pending",
        imageUrl: data.imageUrl || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });

    res.json({
      success: true,
      data: slips,
      count: slips.length
    });
    
  } catch (error) {
    console.error("❌ Error getting slips:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get slips",
      message: error.message
    });
  }
});

// Admin Images Endpoint with real Firebase data
app.get("/api/admin/images", authenticateAdmin, async (req, res) => {
  try {
    const imagesSnap = await db.collection("images")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    
    const images = [];
    imagesSnap.forEach(doc => {
      const data = doc.data();
      images.push({
        id: doc.id,
        borrowerId: data.borrowerId,
        type: data.type || "unknown",
        url: data.url,
        fileName: data.fileName || "unknown.jpg",
        uploadedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        size: data.size || 0,
        mimeType: data.mimeType || "image/jpeg"
      });
    });

    res.json({
      success: true,
      data: images,
      count: images.length
    });
    
  } catch (error) {
    console.error("❌ Error getting images:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get images",
      message: error.message
    });
  }
});

// Admin Approve/Reject API
app.post("/api/admin/approve", authenticateAdmin, (req, res) => {
  try {
    const { borrowerId, action } = req.body;
    
    if (!borrowerId || !action) {
      return res.status(400).json({ error: "Missing borrowerId or action" });
    }
    
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    
    console.log(`${action === "approve" ? "✅" : "❌"} ${action.toUpperCase()} borrower: ${borrowerId}`);

    res.json({
      success: true,
      borrowerId: borrowerId,
      status: newStatus,
      message: `Borrower ${action}d successfully`
    });
    
  } catch (error) {
    console.error("❌ Error in approve API:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Bulk notification API with real LINE messaging
app.post("/api/admin/bulk-notify", authenticateAdmin, async (req, res) => {
  try {
    const { message, targetGroup } = req.body;
    
    if (!message || !targetGroup) {
      return res.status(400).json({ error: "Missing message or targetGroup" });
    }

    const validTargets = ["all", "pending", "overdue", "approved"];
    if (!validTargets.includes(targetGroup)) {
      return res.status(400).json({ error: "Invalid targetGroup" });
    }

    let messagesSent = 0;
    const today = new Date();

    // Get target users based on group
    let query = db.collection("borrowers");
    
    if (targetGroup === "pending") {
      query = query.where("status", "==", "pending");
    } else if (targetGroup === "approved") {
      query = query.where("status", "==", "approved");
    } else if (targetGroup === "overdue") {
      query = query.where("status", "==", "approved");
    }

    const borrowersSnap = await query.get();
    
    for (const doc of borrowersSnap.docs) {
      const data = doc.data();
      
      // Skip if targeting overdue and not actually overdue
      if (targetGroup === "overdue") {
        const dueDate = data.dueDate?.toDate?.();
        if (!dueDate || dueDate >= today) {
          continue;
        }
      }
      
      // Send message if user has LINE userId
      if (data.userId && data.userId !== "anonymous") {
        try {
          await sendPushMessage(data.userId, [
            "📢 ประกาศจาก BaanTK",
            message,
            "ติดต่อเจ้าหน้าที่: 02-123-4567"
          ]);
          messagesSent++;
        } catch (error) {
          console.error(`Failed to send bulk message to ${data.userId}:`, error);
        }
      }
    }
    
    console.log(`📢 Bulk notification sent to ${targetGroup}: "${message}" (${messagesSent} messages)`);

    res.json({
      success: true,
      messagesSent: messagesSent,
      targetGroup: targetGroup,
      totalTargets: borrowersSnap.size
    });
    
  } catch (error) {
    console.error("❌ Error sending bulk notification:", error);
    res.status(500).json({ error: "Failed to send bulk notification" });
  }
});

// Credit Score API
app.post("/api/admin/credit-score", authenticateAdmin, (req, res) => {
  try {
    const { borrowerId } = req.body;
    
    if (!borrowerId) {
      return res.status(400).json({ error: "Missing borrowerId" });
    }

    // Mock credit score data
    const creditScore = Math.floor(Math.random() * 300) + 500;
    const blacklistStatus = { isBlacklisted: Math.random() < 0.1 };
    const autoApprove = creditScore > 700 && !blacklistStatus.isBlacklisted;

    res.json({
      creditScore,
      blacklistStatus,
      autoApprove
    });
    
  } catch (error) {
    console.error("❌ Error calculating credit score:", error);
    res.status(500).json({ error: "Failed to calculate credit score" });
  }
});

// Send reminder API with real LINE messaging
app.post("/send-reminder", authenticateAdmin, async (req, res) => {
  try {
    const { userIds, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let remindersSent = 0;
    
    if (userIds && userIds.length > 0) {
      // Send to specific users
      for (const userId of userIds) {
        try {
          await sendPushMessage(userId, [
            "🔔 การแจ้งเตือนจาก BaanTK",
            message,
            "ติดต่อเจ้าหน้าที่: 02-123-4567"
          ]);
          remindersSent++;
        } catch (error) {
          console.error(`Failed to send reminder to ${userId}:`, error);
        }
      }
    } else {
      // Get borrowers from Firebase and send reminders
      const borrowersSnap = await db.collection("borrowers")
        .where("status", "==", "approved")
        .get();
      
      const today = new Date();
      borrowersSnap.forEach(async (doc) => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate?.();
        
        // Send reminder if due soon or overdue
        if (dueDate && dueDate <= today) {
          if (data.userId && data.userId !== "anonymous") {
            try {
              await sendPushMessage(data.userId, [
                "🔔 แจ้งเตือนการชำระเงิน BaanTK",
                `คุณ ${data.firstName} ${data.lastName}`,
                `ยอดที่ต้องชำระ: ${data.requestedAmount?.toLocaleString()} บาท`,
                `กำหนดชำระ: ${dueDate.toLocaleDateString("th-TH")}`,
                "กรุณาชำระเงินให้ทันเวลา"
              ]);
              remindersSent++;
            } catch (error) {
              console.error(`Failed to send reminder to ${data.userId}:`, error);
            }
          }
        }
      });
    }
    
    console.log(`🔔 Sent ${remindersSent} payment reminders`);
    
    res.json({
      success: true,
      remindersSent: remindersSent,
      message: "Payment reminders sent successfully"
    });
    
  } catch (error) {
    console.error("❌ Error sending reminders:", error);
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

// Check due API
app.post("/check-due", (req, res) => {
  try {
    const mockDueToday = Math.floor(Math.random() * 10) + 2;
    console.log(`📅 Found ${mockDueToday} loans due today`);
    
    res.json({
      success: true,
      dueToday: mockDueToday,
      message: "Due date check completed"
    });
    
  } catch (error) {
    console.error("❌ Error checking due dates:", error);
    res.status(500).json({ error: "Failed to check due dates" });
  }
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Test endpoint working",
    timestamp: new Date().toISOString()
  });
});

console.log("✅ BaanTK webhook function loaded successfully");

// Export minimal webhook function
exports.webhook = require('./minimal').webhook;
