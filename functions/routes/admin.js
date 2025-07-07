// 👨‍💼 Admin Routes Module
const express = require("express");
const admin = require("firebase-admin");
const { createLoginLimiter } = require("../middleware/security");
const validationService = require("../validation");
const securityService = require("../security");
const ContractService = require("../contractService");
const loanHelpers = require("../modules/loanHelpers");
const { sendStatusUpdateNotification, sendApprovalNotificationWithContract } = require("./dashboard");

const router = express.Router();

// เลื่อนการเรียกใช้ db ไปใน function เพื่อให้ Firebase Admin initialize ก่อน
function getDb() {
  return admin.firestore();
}

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

// Admin login endpoint with JWT token generation
router.post("/login", createLoginLimiter(), async (req, res) => {
  try {
    const { username, password, token } = req.body;

    // ใช้ระบบยืนยันตัวตนที่ปลอดภัย
    let isValidAdmin = false;
    let adminData = {};

    const validAdminToken = process.env.ADMIN_SECRET_TOKEN ||
                           require("firebase-functions").config().admin?.secret_token;
    
    if (!validAdminToken) {
      console.error("❌ ADMIN_SECRET_TOKEN not configured");
      return res.status(500).json({
        error: "Server configuration error",
        message: "ระบบยืนยันตัวตนไม่พร้อมใช้งาน"
      });
    }

    if (token && token === validAdminToken) {
      isValidAdmin = true;
      adminData = { id: "admin", username: "admin", type: "token" };
    } else if (username && password) {
      // ตรวจสอบ username/password จาก environment variables
      const validUsername = process.env.ADMIN_USERNAME || "admin";
      const validPassword = process.env.ADMIN_PASSWORD;
      
      if (!validPassword) {
        console.error("❌ ADMIN_PASSWORD not configured");
        return res.status(500).json({
          error: "Server configuration error",
          message: "ระบบยืนยันตัวตนไม่พร้อมใช้งาน"
        });
      }
      
      if (username === validUsername && password === validPassword) {
        isValidAdmin = true;
        adminData = { id: "admin", username: username, type: "credentials" };
      }
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

// ==========================================
// PROTECTED ROUTES (Authentication Required)
// ==========================================

// Apply authentication middleware to all routes below
router.use(securityService.authenticateAdmin);

// Get all borrowers with enhanced filtering and pagination
router.get("/borrowers", async (req, res) => {
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

    const db = getDb();
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

// Enhanced approve/reject loan application
router.post("/approve", async (req, res) => {
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

    const db = getDb();
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

    // If approved, set additional fields and create contract
    if (action === "approve") {
      updateData.approvedAt = now;
      updateData.approvedAmount = borrowerData.amount || borrowerData.requestedAmount;
      updateData.disbursementStatus = "pending_contract";

      // Generate and save contract
      const loanTerms = borrowerData.loanTerms || loanHelpers.calculateLoanTerms(borrowerData, borrowerData.creditAssessment);
      const settings = await loanHelpers.getSystemSettings();

      const contractData = ContractService.generateContract(borrowerData, loanTerms, settings);
      const contractId = await ContractService.saveContract(contractData, borrowerId);

      updateData.contractId = contractId;
      updateData.contractGenerated = true;
    }

    // Update borrower record
    await borrowerRef.update(updateData);

    // Log admin action with detailed information
    await db.collection("adminLogs").add({
      type: "loan_review",
      action: action,
      borrowerId: borrowerId,
      borrowerName: `${borrowerData.firstName} ${borrowerData.lastName}`,
      amount: borrowerData.requestedAmount || borrowerData.amount,
      creditScore: borrowerData.creditScore,
      previousStatus: borrowerData.status,
      newStatus: status,
      notes: notes,
      adminId: req.admin.id || "admin",
      timestamp: now
    });

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

// Helper functions are now centralized in loanHelpers module

module.exports = router;