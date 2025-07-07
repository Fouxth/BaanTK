// 🔧 Loan Processing Helper Functions Module
const admin = require("firebase-admin");

// เลื่อนการเรียกใช้ db ไปใน function เพื่อให้ Firebase Admin initialize ก่อน
function getDb() {
  return admin.firestore();
}

/**
 * เปรียบเทียบข้อมูลที่ผู้ใช้กรอกับข้อมูลจากทะเบียนราษฎร
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
function createBorrowerRecord(userData, creditAssessment, loanTerms, autoApproval, req, requestId, imageData = {}) {
  return {
    // ข้อมูลพื้นฐาน
    userId: userData.userId,
    requestId: requestId,

    // ข้อมูลส่วนตัวจากทะเบียนราษฎร (ใช้ fallback values เพื่อป้องกัน undefined)
    titleName: userData.titleName || null,
    firstName: userData.officialFirstName || userData.firstName,
    lastName: userData.officialLastName || userData.lastName,
    birthDate: userData.birthDate,
    idCard: userData.idCard,
    gender: userData.gender || null,
    nationality: userData.nationality || null,
    religion: userData.religion || null,

    // ที่อยู่
    address: userData.address, // ที่อยู่ที่กรอก
    addressOnId: userData.addressOnId || userData.address, // ที่อยู่ตามบัตร
    currentAddress: userData.currentAddress || userData.address, // ที่อยู่ปัจจุบัน
    officialAddress: userData.officialAddress || null, // ที่อยู่จากทะเบียนราษฎร
    addressDetails: userData.addressDetails || null,

    // ข้อมูลสินเชื่อ
    amount: userData.amount,
    frequency: userData.frequency,
    loanTerms: loanTerms,

    // ประเมินความเสี่ยง
    creditAssessment: creditAssessment,
    creditHistory: userData.creditHistory || null,
    autoApproval: autoApproval,

    // สถานะ
    status: autoApproval.status,
    paid: 0,

    // ข้อมูลบัตรประชาชน
    idCardStatus: userData.idCardStatus || null,
    idCardIssueDate: userData.idCardIssueDate || null,
    idCardExpiryDate: userData.idCardExpiryDate || null,

    // 📷 รูปภาพ (รองรับทั้งแบบแยกและรวม)
    ...(imageData.idCardImage && {
      idCardImage: imageData.idCardImage,
      idCardImageName: imageData.idCardImageName,
      idCardImageSize: imageData.idCardImageSize,
      hasIdCardImage: true
    }),
    ...(imageData.selfieImage && {
      selfieImage: imageData.selfieImage,
      selfieImageName: imageData.selfieImageName,
      selfieImageSize: imageData.selfieImageSize,
      hasSelfieImage: true
    }),

    // เก็บข้อมูลรูปภาพแยกต่างหากสำหรับ backward compatibility
    idCardImage: imageData.idCardImage || userData.idCardImage || null,
    idCardImageName: imageData.idCardImageName || userData.idCardImageName || null,
    idCardImageSize: imageData.idCardImageSize || userData.idCardImageSize || null,
    selfieImage: imageData.selfieImage || userData.selfieImage || null,
    selfieImageName: imageData.selfieImageName || userData.selfieImageName || null,
    selfieImageSize: imageData.selfieImageSize || userData.selfieImageSize || null,

    // ข้อมูลระบบ
    dataSource: userData.dataSource || "manual",
    verificationTimestamp: userData.verificationTimestamp || new Date().toISOString(),
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

/**
 * Check blacklist with enhanced logging
 */
async function checkBlacklist(idCard, userId) {
  try {
    const db = getDb();
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

/**
 * Check for duplicate applications with enhanced detection
 */
async function checkDuplicateApplication(idCard, userId) {
  try {
    const db = getDb();
    
    // แยก query ออกมาเป็นรายการแยก เพื่อไม่ต้องใช้ compound index
    const duplicateByIdCard = await db.collection("borrowers")
      .where("idCard", "==", idCard)
      .where("status", "in", ["pending", "approved"])
      .get();

    const duplicateByUserId = await db.collection("borrowers")
      .where("userId", "==", userId)
      .where("status", "in", ["pending", "approved"])
      .get();

    // ตรวจสอบ recent applications โดยไม่ใช้ compound index
    const cutoffTime = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    const recentQuery = await db.collection("borrowers")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    // Check if any recent applications are within 24 hours
    const hasRecentApplication = recentQuery.docs.some(doc => {
      const createTime = doc.get("createdAt");
      return createTime && createTime >= cutoffTime;
    });

    const isDuplicate = !duplicateByIdCard.empty || !duplicateByUserId.empty;

    if (isDuplicate || hasRecentApplication) {
      console.log("🔄 Duplicate application detected:", {
        idCard,
        userId,
        duplicateByIdCard: !duplicateByIdCard.empty,
        duplicateByUserId: !duplicateByUserId.empty,
        recentApplications: recentQuery.size
      });
    }

    return isDuplicate || hasRecentApplication;
  } catch (error) {
    console.error("Error checking duplicates:", error);
    // ถ้า error ให้ return false เพื่อไม่ block การสมัคร
    return false;
  }
}

/**
 * Get system settings
 */
async function getSystemSettings() {
  try {
    const db = getDb();
    const settingsDoc = await db.collection("settings").doc("loan").get();
    if (settingsDoc.exists) {
      return settingsDoc.data();
    }

    // Default settings
    return {
      dailyInterestRate: 0.20,
      weeklyInterestRate: 0.15,
      monthlyInterestRate: 0.10,
      maxLoanAmount: 50000,
      minLoanAmount: 1000
    };
  } catch (error) {
    console.error("Error getting settings:", error);
    return {
      dailyInterestRate: 0.20,
      weeklyInterestRate: 0.15,
      monthlyInterestRate: 0.10,
      maxLoanAmount: 50000,
      minLoanAmount: 1000
    };
  }
}

/**
 * Thai ID Card validation with checksum
 */
function validateThaiIDCard(idCard) {
  if (idCard.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(idCard[i]) * (13 - i);
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(idCard[12]);
}

/**
 * Calculate credit score based on profile
 */
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

module.exports = {
  compareUserDataWithGovernmentData,
  calculateLoanTerms,
  determineAutoApproval,
  createBorrowerRecord,
  sendApprovalNotification,
  checkBlacklist,
  checkDuplicateApplication,
  getSystemSettings,
  validateThaiIDCard,
  calculateCreditScore
};