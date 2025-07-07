// 📊 Dashboard and Blacklist Management Routes Module
const express = require("express");
const admin = require("firebase-admin");
const validationService = require("../validation");
const securityService = require("../security");

const router = express.Router();

// เลื่อนการเรียกใช้ db ไปใน function เพื่อให้ Firebase Admin initialize ก่อน
function getDb() {
  return admin.firestore();
}

// Enhanced dashboard statistics with comprehensive analytics (Admin only)
router.get("/stats", async (req, res) => {
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
      getDb().collection("borrowers").get(),
      getDb().collection("borrowers").where("status", "==", "pending").get(),
      getDb().collection("borrowers").where("status", "==", "approved").get(),
      getDb().collection("borrowers").where("status", "==", "rejected").get(),
      getDb().collection("borrowers").where("status", "==", "completed").get(),
      getDb().collection("borrowers")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
        .get(),
      getDb().collection("borrowers")
        .where("status", "in", ["approved", "completed"])
        .get(),
      getDb().collection("borrowers")
        .where("status", "==", "approved")
        .where("dueDate", "<", admin.firestore.Timestamp.fromDate(now))
        .get(),
      getDb().collection("borrowers")
        .where("autoApproved", "==", true)
        .get(),
      getDb().collection("borrowers")
        .where("riskLevel", "==", "high")
        .get(),
      getDb().collection("blacklist").get()
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
router.post("/blacklist", async (req, res) => {
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
    const db = getDb();
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
router.get("/blacklist", async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pagination = validationService.validatePagination(page, limit);

    const db = getDb();
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
router.delete("/blacklist/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const db = getDb();
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

// Send status update notification helper
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

    await getDb().collection("notifications").add(notificationData);
    return { success: true };
  } catch (error) {
    console.error("Failed to send status notification:", error);
    return { success: false, error: error.message };
  }
}

// Send approval notification with contract
async function sendApprovalNotificationWithContract(borrowerData, contractId) {
  try {
    const contractUrl = `https://baan-tk.web.app/contract-sign.html?contractId=${contractId}`;
    const message = `🎉 ยินดีด้วย! เงินกู้ของคุณได้รับการอนุมัติแล้ว

จำนวนเงิน: ${(borrowerData.amount || borrowerData.requestedAmount).toLocaleString()} บาท

📄 กรุณาลงนามในสัญญาอิเล็กทรอนิกส์:
${contractUrl}

⚠️ สำคัญ: กรุณาลงนามภายใน 24 ชั่วโมง เพื่อให้เงินถูกโอนเข้าบัญชี`;

    const notificationData = {
      type: "loan_approved_with_contract",
      borrowerId: borrowerData.id,
      recipient: borrowerData.userId,
      message: message,
      contractId: contractId,
      contractUrl: contractUrl,
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    await getDb().collection("notifications").add(notificationData);
    console.log(`📧 Approval notification sent with contract: ${contractId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send approval notification:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  router,
  sendStatusUpdateNotification,
  sendApprovalNotificationWithContract
};