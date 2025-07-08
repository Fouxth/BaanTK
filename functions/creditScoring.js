// Enhanced Credit Scoring and Risk Assessment Module
const admin = require("firebase-admin");

class CreditScoringService {
  constructor() {
    this.baseScore = 600;
    this.maxScore = 850;
    this.minScore = 300;
  }

  // Calculate comprehensive credit score
  async calculateCreditScore(userData, userId) {
    let score = this.baseScore;
    const factors = {};

    try {
      // Age factor analysis
      const ageFactor = this.calculateAgeFactor(userData.birthDate);
      score += ageFactor.score;
      factors.age = ageFactor;

      // Amount factor analysis
      const amountFactor = this.calculateAmountFactor(userData.amount);
      score += amountFactor.score;
      factors.amount = amountFactor;

      // Frequency factor analysis
      const frequencyFactor = this.calculateFrequencyFactor(userData.frequency);
      score += frequencyFactor.score;
      factors.frequency = frequencyFactor;

      // Historical performance factor
      const historyFactor = await this.calculateHistoryFactor(userData.idCard, userId);
      score += historyFactor.score;
      factors.history = historyFactor;

      // Application timing factor
      const timingFactor = await this.calculateTimingFactor(userId);
      score += timingFactor.score;
      factors.timing = timingFactor;

      // Geographic risk factor
      const geoFactor = this.calculateGeographicFactor(userData.address);
      score += geoFactor.score;
      factors.geographic = geoFactor;

      // Name consistency factor
      const nameFactor = this.calculateNameFactor(userData.firstName, userData.lastName);
      score += nameFactor.score;
      factors.name = nameFactor;

      // Final score normalization
      const finalScore = Math.min(Math.max(score, this.minScore), this.maxScore);

      return {
        score: finalScore,
        grade: this.getScoreGrade(finalScore),
        riskLevel: this.getRiskLevel(finalScore),
        factors: factors,
        recommendation: this.getRecommendation(finalScore, userData),
        autoApprovalEligible: this.isAutoApprovalEligible(finalScore, userData)
      };
    } catch (error) {
      console.error("Error calculating credit score:", error);
      return {
        score: this.baseScore,
        grade: "B",
        riskLevel: "medium",
        factors: {},
        recommendation: "manual_review",
        autoApprovalEligible: false
      };
    }
  }

  // Age factor scoring (18-80 years)
  calculateAgeFactor(birthDateString) {
    const age = this.calculateAge(birthDateString);
    let score = 0;
    let reasoning = "";

    if (age >= 25 && age <= 45) {
      score = 50;
      reasoning = "Prime working age (25-45) - highest earning potential";
    } else if (age >= 18 && age <= 24) {
      score = 20;
      reasoning = "Young adult - developing financial stability";
    } else if (age >= 46 && age <= 55) {
      score = 40;
      reasoning = "Established career - stable income likely";
    } else if (age >= 56 && age <= 65) {
      score = 25;
      reasoning = "Pre-retirement - income may decline";
    } else if (age >= 66 && age <= 80) {
      score = 10;
      reasoning = "Retirement age - fixed/limited income";
    } else {
      score = -50;
      reasoning = "Outside acceptable age range";
    }

    return { score, age, reasoning };
  }

  // Amount factor scoring
  calculateAmountFactor(amount) {
    let score = 0;
    let reasoning = "";

    if (amount <= 5000) {
      score = 50;
      reasoning = "Low risk amount - easily manageable";
    } else if (amount <= 15000) {
      score = 30;
      reasoning = "Moderate amount - standard risk";
    } else if (amount <= 30000) {
      score = 10;
      reasoning = "High amount - requires stable income";
    } else if (amount <= 50000) {
      score = -20;
      reasoning = "Very high amount - significant risk";
    } else {
      score = -50;
      reasoning = "Exceeds lending limit";
    }

    return { score, amount, reasoning };
  }

  // Payment frequency factor scoring
  calculateFrequencyFactor(frequency) {
    let score = 0;
    let reasoning = "";

    switch (frequency) {
    case "monthly":
      score = 30;
      reasoning = "Monthly payments - stable and predictable";
      break;
    case "weekly":
      score = 20;
      reasoning = "Weekly payments - good cash flow management";
      break;
    case "daily":
      score = 10;
      reasoning = "Daily payments - high frequency, potential stress";
      break;
    default:
      score = -20;
      reasoning = "Invalid payment frequency";
    }

    return { score, frequency, reasoning };
  }

  // Historical performance factor
  async calculateHistoryFactor(idCard, userId) {
    try {
      const db = admin.firestore();

      // Check previous loans
      const previousLoans = await db.collection("borrowers")
        .where("idCard", "==", idCard)
        .where("status", "==", "completed")
        .get();

      const userLoans = await db.collection("borrowers")
        .where("userId", "==", userId)
        .where("status", "==", "completed")
        .get();

      let score = 0;
      let reasoning = "";

      const totalPreviousLoans = previousLoans.size + userLoans.size;

      if (totalPreviousLoans === 0) {
        score = 0;
        reasoning = "No previous loan history - neutral impact";
      } else {
        // Check payment performance
        let onTimePayments = 0;
        let totalPayments = 0;

        [...previousLoans.docs, ...userLoans.docs].forEach((doc) => {
          const data = doc.data();
          if (data.paymentHistory) {
            totalPayments += data.paymentHistory.length;
            onTimePayments += data.paymentHistory.filter((p) => p.onTime).length;
          }
        });

        if (totalPayments > 0) {
          const onTimeRate = onTimePayments / totalPayments;

          if (onTimeRate >= 0.95) {
            score = 60;
            reasoning = `Excellent payment history - ${(onTimeRate * 100).toFixed(1)}% on-time`;
          } else if (onTimeRate >= 0.85) {
            score = 40;
            reasoning = `Good payment history - ${(onTimeRate * 100).toFixed(1)}% on-time`;
          } else if (onTimeRate >= 0.70) {
            score = 20;
            reasoning = `Fair payment history - ${(onTimeRate * 100).toFixed(1)}% on-time`;
          } else {
            score = -40;
            reasoning = `Poor payment history - ${(onTimeRate * 100).toFixed(1)}% on-time`;
          }
        } else {
          score = 20;
          reasoning = "Previous loans completed - no detailed payment data";
        }
      }

      return { score, totalPreviousLoans, reasoning };
    } catch (error) {
      console.error("Error calculating history factor:", error);
      return { score: 0, totalPreviousLoans: 0, reasoning: "Unable to retrieve history" };
    }
  }

  // Application timing factor
  async calculateTimingFactor(userId) {
    try {
      const db = admin.firestore();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Check recent applications โดยใช้ single field index เท่านั้น
      const recentApps = await db.collection("borrowers")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      // Filter results in memory เพื่อไม่ต้องใช้ compound index
      const oneWeekApps = recentApps.docs.filter(doc => {
        const createTime = doc.get("createdAt");
        return createTime && createTime.toDate() >= oneWeekAgo;
      });

      const todayApps = oneWeekApps.filter(doc => {
        const createTime = doc.get("createdAt");
        return createTime && createTime.toDate() >= oneDayAgo;
      });

      let score = 0;
      let reasoning = "";

      if (todayApps.length > 1) {
        score = -30;
        reasoning = "Multiple applications today - potential desperation";
      } else if (oneWeekApps.length > 2) {
        score = -20;
        reasoning = "Multiple applications this week - concerning pattern";
      } else if (oneWeekApps.length === 0) {
        score = 10;
        reasoning = "First application in a while - good timing";
      } else {
        score = 0;
        reasoning = "Normal application timing";
      }

      return { score, recentApplications: recentApps.size, reasoning };
    } catch (error) {
      console.error("Error calculating timing factor:", error);
      return { score: 0, recentApplications: 0, reasoning: "Unable to check timing" };
    }
  }

  // Geographic risk factor
  calculateGeographicFactor(address) {
    let score = 0;
    let reasoning = "";

    // High-risk keywords in address
    const highRiskAreas = ["ชุมชน", "หมู่บ้าน", "แปลงที่", "ตรอก", "ซอย"];
    const lowRiskAreas = ["ถนน", "อาคาร", "คอนโด", "มอลล์", "ห้างสรรพสินค้า"];

    const addressLower = address.toLowerCase();

    if (lowRiskAreas.some((area) => addressLower.includes(area))) {
      score = 20;
      reasoning = "Low-risk area - urban/commercial location";
    } else if (highRiskAreas.some((area) => addressLower.includes(area))) {
      score = -10;
      reasoning = "Higher-risk area - rural/community location";
    } else {
      score = 0;
      reasoning = "Standard area classification";
    }

    // Address completeness check
    if (address.length < 20) {
      score -= 10;
      reasoning += " - Incomplete address provided";
    }

    return { score, addressLength: address.length, reasoning };
  }

  // Name consistency factor
  calculateNameFactor(firstName, lastName) {
    let score = 0;
    let reasoning = "";

    // Check for common patterns that might indicate fake names
    const suspiciousPatterns = [
      /test/i, /demo/i, /fake/i, /sample/i,
      /aaa/i, /bbb/i, /xxx/i, /zzz/i
    ];

    const fullName = `${firstName} ${lastName}`.toLowerCase();

    if (suspiciousPatterns.some((pattern) => pattern.test(fullName))) {
      score = -30;
      reasoning = "Suspicious name pattern detected";
    } else if (firstName.length < 2 || lastName.length < 2) {
      score = -10;
      reasoning = "Very short name provided";
    } else if (/^[ก-๙\s]+$/.test(fullName)) {
      score = 10;
      reasoning = "Thai name - local applicant";
    } else if (/^[a-zA-Z\s]+$/.test(fullName)) {
      score = 5;
      reasoning = "English name - international applicant";
    } else {
      score = 0;
      reasoning = "Mixed character name";
    }

    return { score, fullName: `${firstName} ${lastName}`, reasoning };
  }

  // Get score grade (A-F)
  getScoreGrade(score) {
    if (score >= 750) return "A+";
    if (score >= 700) return "A";
    if (score >= 650) return "B+";
    if (score >= 600) return "B";
    if (score >= 550) return "B-";
    if (score >= 500) return "C+";
    if (score >= 450) return "C";
    if (score >= 400) return "C-";
    if (score >= 350) return "D";
    return "F";
  }

  // Get risk level
  getRiskLevel(score) {
    if (score >= 700) return "low";
    if (score >= 600) return "medium";
    if (score >= 450) return "high";
    return "very_high";
  }

  // Get approval recommendation (ปิดการอนุมัติอัตโนมัติ)
  getRecommendation(score, userData) {
    const riskLevel = this.getRiskLevel(score);

    // ปิดการอนุมัติอัตโนมัติ - ทุกคำขอต้องผ่านการอนุมัติจากแอดมิน
    if (riskLevel === "very_high") {
      return "reject_recommended";
    } else {
      return "manual_review_required";
    }

    /* เก็บไว้สำหรับการใช้งานในอนาคต
    if (riskLevel === "low" && userData.amount <= 10000) {
      return "auto_approve";
    } else if (riskLevel === "low" || riskLevel === "medium") {
      return "manual_review_recommended";
    } else if (riskLevel === "high") {
      return "manual_review_required";
    } else {
      return "reject_recommended";
    }
    */
  }

  // Check auto-approval eligibility (ปิดการอนุมัติอัตโนมัติ)
  isAutoApprovalEligible(score, userData) {
    // ปิดการอนุมัติอัตโนมัติทั้งหมด
    return false;
    
    /* เก็บไว้สำหรับการใช้งานในอนาคต
    return score >= 700 &&
               userData.amount <= 10000 &&
               ["weekly", "monthly"].includes(userData.frequency);
    */
  }

  // Calculate age from birth date string
  calculateAge(birthDateString) {
    const [day, month, year] = birthDateString.split("/").map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  // Generate credit report
  generateCreditReport(creditData, userData) {
    return {
      applicant: {
        name: `${userData.firstName} ${userData.lastName}`,
        idCard: userData.idCard,
        age: this.calculateAge(userData.birthDate)
      },
      loan: {
        requestedAmount: userData.amount,
        frequency: userData.frequency
      },
      assessment: {
        creditScore: creditData.score,
        grade: creditData.grade,
        riskLevel: creditData.riskLevel,
        recommendation: creditData.recommendation,
        autoApprovalEligible: creditData.autoApprovalEligible
      },
      factors: creditData.factors,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = new CreditScoringService();
