// 📄 Contract Management Routes Module
const express = require("express");
const admin = require("firebase-admin");
const ContractService = require("../contractService");

const router = express.Router();

// เลื่อนการเรียกใช้ db ไปใน function เพื่อให้ Firebase Admin initialize ก่อน
function getDb() {
  return admin.firestore();
}

// Simple authentication middleware for users
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "กรุณาเข้าสู่ระบบ"
      });
    }

    const userId = authHeader.substring(7); // Remove 'Bearer '

    if (!userId) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Token ไม่ถูกต้อง"
      });
    }

    req.user = { userId };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({
      error: "Authentication failed",
      message: "การยืนยันตัวตนล้มเหลว"
    });
  }
}

// Get contract by ID
router.get("/:contractId", authenticateUser, async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.userId;

    const contractDoc = await getDb().collection("contracts").doc(contractId).get();

    if (!contractDoc.exists) {
      return res.status(404).json({
        error: "Contract not found",
        message: "ไม่พบสัญญา"
      });
    }

    const contractData = contractDoc.data();

    // Verify ownership
    const borrowerDoc = await getDb().collection("borrowers").doc(contractData.borrowerId).get();
    if (!borrowerDoc.exists || borrowerDoc.data().userId !== userId) {
      return res.status(403).json({
        error: "Access denied",
        message: "ไม่มีสิทธิ์เข้าถึงสัญญานี้"
      });
    }

    res.json({
      success: true,
      data: contractData
    });
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({
      error: "Failed to fetch contract",
      message: "ไม่สามารถโหลดสัญญาได้"
    });
  }
});

// Sign contract
router.post("/sign", authenticateUser, async (req, res) => {
  try {
    const { contractId, signatureData, timestamp } = req.body;
    const userId = req.user.userId;

    // Validate contract ownership
    const contractDoc = await getDb().collection("contracts").doc(contractId).get();
    if (!contractDoc.exists) {
      return res.status(404).json({
        error: "Contract not found",
        message: "ไม่พบสัญญา"
      });
    }

    const contractData = contractDoc.data();
    const borrowerDoc = await getDb().collection("borrowers").doc(contractData.borrowerId).get();

    if (!borrowerDoc.exists || borrowerDoc.data().userId !== userId) {
      return res.status(403).json({
        error: "Access denied",
        message: "ไม่มีสิทธิ์ลงนามสัญญานี้"
      });
    }

    // Sign contract
    await ContractService.signContract(contractId, contractData.borrowerId, {
      signature: signatureData,
      timestamp,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    }, req);

    // Update borrower status
    await getDb().collection("borrowers").doc(contractData.borrowerId).update({
      status: "contract_signed",
      disbursementStatus: "approved",
      contractSignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log signing event
    await getDb().collection("contractLogs").add({
      type: "contract_signed",
      contractId,
      borrowerId: contractData.borrowerId,
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({
      success: true,
      message: "ลงนามสัญญาสำเร็จ",
      data: {
        contractId,
        signedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error signing contract:", error);
    res.status(500).json({
      error: "Failed to sign contract",
      message: "ไม่สามารถลงนามสัญญาได้"
    });
  }
});

module.exports = router;