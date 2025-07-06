// functions/utils/dataManager.js
const admin = require("firebase-admin");
const db = admin.firestore();

class DataManager {
  // ✅ สร้างรายงานขั้นสูง
  static async generateAdvancedReport(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const borrowersSnap = await db.collection("borrowers")
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", end)
        .get();

      const slipsSnap = await db.collection("slips")
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", end)
        .get();

      let totalLoanAmount = 0;
      let totalPaidAmount = 0;
      const statusCounts = { pending: 0, approved: 0, rejected: 0 };
      const frequencyCounts = { daily: 0, weekly: 0, monthly: 0 };

      borrowersSnap.forEach((doc) => {
        const data = doc.data();
        totalLoanAmount += data.totalLoan || 0;
        statusCounts[data.status] = (statusCounts[data.status] || 0) + 1;
        frequencyCounts[data.frequency] = (frequencyCounts[data.frequency] || 0) + 1;
      });

      slipsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "approved") {
          totalPaidAmount += data.amount || 0;
        }
      });

      return {
        period: { start: startDate, end: endDate },
        summary: {
          totalBorrowers: borrowersSnap.size,
          totalLoanAmount,
          totalPaidAmount,
          outstandingAmount: totalLoanAmount - totalPaidAmount
        },
        breakdown: {
          byStatus: statusCounts,
          byFrequency: frequencyCounts
        },
        paymentStats: {
          totalSlips: slipsSnap.size,
          approvedSlips: slipsSnap.docs.filter((doc) => doc.data().status === "approved").length,
          pendingSlips: slipsSnap.docs.filter((doc) => doc.data().status === "pending").length
        }
      };
    } catch (error) {
      console.error("❌ Error generating report:", error);
      throw error;
    }
  }

  // ✅ ระบบประเมินความเสี่ยง
  static calculateCreditScore(borrowerData) {
    let score = 500; // คะแนนฐาน

    // อายุ (จากวันเกิด)
    const birthYear = new Date(borrowerData.birthDate).getFullYear();
    const age = new Date().getFullYear() - birthYear;
    if (age >= 25 && age <= 60) score += 100;
    else if (age >= 18 && age < 25) score += 50;
    else score -= 50;

    // จำนวนเงินที่กู้
    if (borrowerData.totalLoan <= 10000) score += 100;
    else if (borrowerData.totalLoan <= 30000) score += 50;
    else score -= 50;

    // รูปแบบการชำระ (monthly ความเสี่ยงต่ำกว่า daily)
    if (borrowerData.frequency === "monthly") score += 100;
    else if (borrowerData.frequency === "weekly") score += 50;
    // daily ไม่เพิ่มคะแนน

    // ประวัติการกู้ก่อนหน้า (ถ้ามี)
    // TODO: เพิ่มการตรวจสอบประวัติจาก external API

    // จำกัดคะแนนระหว่าง 300-850
    return Math.max(300, Math.min(850, score));
  }

  // ✅ ตรวจสอบลูกค้า Blacklist
  static async checkBlacklist(idCard, phoneNumber) {
    try {
      const blacklistSnap = await db.collection("blacklist")
        .where("idCard", "==", idCard)
        .get();

      if (!blacklistSnap.empty) {
        return {
          isBlacklisted: true,
          reason: blacklistSnap.docs[0].data().reason,
          dateAdded: blacklistSnap.docs[0].data().createdAt
        };
      }

      // ตรวจสอบจากเบอร์โทร
      if (phoneNumber) {
        const phoneBlacklistSnap = await db.collection("blacklist")
          .where("phoneNumber", "==", phoneNumber)
          .get();

        if (!phoneBlacklistSnap.empty) {
          return {
            isBlacklisted: true,
            reason: phoneBlacklistSnap.docs[0].data().reason,
            dateAdded: phoneBlacklistSnap.docs[0].data().createdAt
          };
        }
      }

      return { isBlacklisted: false };
    } catch (error) {
      console.error("❌ Error checking blacklist:", error);
      return { isBlacklisted: false, error: true };
    }
  }

  // ✅ เพิ่มลูกค้าใน Blacklist
  static async addToBlacklist(borrowerData, reason) {
    try {
      await db.collection("blacklist").add({
        userId: borrowerData.userId,
        idCard: borrowerData.idCard,
        firstName: borrowerData.firstName,
        lastName: borrowerData.lastName,
        phoneNumber: borrowerData.phoneNumber || null,
        reason: reason,
        createdAt: admin.firestore.Timestamp.now(),
        addedBy: "SYSTEM"
      });

      console.log(`✅ Added ${borrowerData.firstName} ${borrowerData.lastName} to blacklist`);
      return true;
    } catch (error) {
      console.error("❌ Error adding to blacklist:", error);
      return false;
    }
  }

  // ✅ คำนวณดอกเบี้ยค้างชำระ
  static calculateOverdueInterest(borrowerData, currentDate = new Date()) {
    const dueDate = borrowerData.dueDate?.toDate?.() || new Date();
    const overdueDays = Math.max(0, Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24)));

    if (overdueDays === 0) {
      return {
        overdueDays: 0,
        penalty: 0,
        totalOwed: borrowerData.totalLoan + (borrowerData.totalLoan * borrowerData.interestRate)
      };
    }

    const baseAmount = borrowerData.totalLoan + (borrowerData.totalLoan * borrowerData.interestRate);
    const dailyPenaltyRate = 0.05; // 5% ต่อวัน
    const penalty = baseAmount * dailyPenaltyRate * overdueDays;

    return {
      overdueDays,
      penalty,
      totalOwed: baseAmount + penalty,
      dailyPenaltyRate
    };
  }

  // ✅ ระบบแจ้งเตือนแบบขั้นตอน
  static async sendEscalatedReminder(borrowerData, overdueLevel) {
    const client = require("@line/bot-sdk").Client;
    const lineClient = new client({
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.CHANNEL_SECRET
    });

    const overdueInfo = this.calculateOverdueInterest(borrowerData);
    let message;

    switch (overdueLevel) {
    case "gentle": // 1-3 วัน
      message = {
        type: "flex",
        altText: "แจ้งเตือนการชำระ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "💳 แจ้งเตือนการชำระ", weight: "bold", color: "#F59E0B" },
              { type: "text", text: `คุณ ${borrowerData.firstName} มียอดค้างชำระ ${overdueInfo.overdueDays} วัน` },
              { type: "text", text: `ยอดที่ต้องชำระ: ${overdueInfo.totalOwed.toFixed(2)} บาท` }
            ]
          }
        }
      };
      break;

    case "urgent": // 4-7 วัน
      message = {
        type: "flex",
        altText: "เร่งด่วน: ค้างชำระ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "⚠️ เร่งด่วน: ค้างชำระ", weight: "bold", color: "#EF4444" },
              { type: "text", text: `คุณ ${borrowerData.firstName} ค้างชำระ ${overdueInfo.overdueDays} วัน` },
              { type: "text", text: `ค่าปรับเพิ่มขึ้น ${overdueInfo.penalty.toFixed(2)} บาท` },
              { type: "text", text: "กรุณาชำระเพื่อหลีกเลี่ยงการดำเนินการเพิ่มเติม" }
            ]
          }
        }
      };
      break;

    case "final": // 8+ วัน
      message = {
        type: "flex",
        altText: "แจ้งเตือนสุดท้าย",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "🚨 แจ้งเตือนสุดท้าย", weight: "bold", color: "#991B1B" },
              { type: "text", text: "หากไม่ชำระภายใน 48 ชั่วโมง จะดำเนินการทางกฎหมาย" },
              { type: "text", text: `ยอดรวม: ${overdueInfo.totalOwed.toFixed(2)} บาท` },
              { type: "text", text: "📞 ติดต่อ: 085-829-4254" }
            ]
          }
        }
      };
      break;
    }

    try {
      await lineClient.pushMessage(borrowerData.userId, message);

      // บันทึกประวัติการแจ้งเตือน
      await db.collection("reminders").add({
        userId: borrowerData.userId,
        borrowerId: borrowerData.id,
        level: overdueLevel,
        overdueDays: overdueInfo.overdueDays,
        totalOwed: overdueInfo.totalOwed,
        sentAt: admin.firestore.Timestamp.now()
      });

      return true;
    } catch (error) {
      console.error("❌ Error sending escalated reminder:", error);
      return false;
    }
  }

  // ✅ ระบบ Auto-approve ตามเงื่อนไข
  static shouldAutoApprove(borrowerData) {
    const creditScore = this.calculateCreditScore(borrowerData);

    // เงื่อนไขการ auto-approve
    const conditions = [
      creditScore >= 650,
      borrowerData.totalLoan <= 20000,
      borrowerData.frequency === "monthly" // ชำระรายเดือนเสี่ยงต่ำ
    // TODO: เพิ่มเงื่อนไขอื่นๆ เช่น การตรวจสอบเอกสาร AI
    ];

    return conditions.every((condition) => condition === true);
  }
}

module.exports = DataManager;
