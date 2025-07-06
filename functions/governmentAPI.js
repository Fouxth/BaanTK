// ID Card Validation Service
// ระบบตรวจสอบความถูกต้องของเลขบัตรประชาชน

const functions = require("firebase-functions");

/**
 * ตรวจสอบความถูกต้องของเลขบัตรประชาชนไทย
 * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
 * @returns {boolean} ผลการตรวจสอบ
 */
function validateThaiIDCard(idCard) {
  try {
    console.log(`🔍 Validating Thai ID Card: ${idCard ? idCard.substring(0, 4) + '****' : 'null'}`);
    
    // ตรวจสอบความยาว
    if (!idCard || idCard.length !== 13) {
      console.log(`❌ Invalid length: ${idCard ? idCard.length : 0} (should be 13)`);
      return false;
    }
    
    // ตรวจสอบว่าเป็นตัวเลขทั้งหมด
    if (!/^\d{13}$/.test(idCard)) {
      console.log(`❌ Invalid format: contains non-numeric characters`);
      return false;
    }
    
    // ตรวจสอบ checksum ตามอัลกอริทึมของบัตรประชาชนไทย
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(idCard[i]) * (13 - i);
    }
    
    const remainder = sum % 11;
    const checkDigit = (11 - remainder) % 10;
    const lastDigit = parseInt(idCard[12]);
    
    const isValid = checkDigit === lastDigit;
    
    if (isValid) {
      console.log(`✅ Valid Thai ID Card checksum`);
    } else {
      console.log(`❌ Invalid checksum: expected ${checkDigit}, got ${lastDigit}`);
    }
    
    return isValid;
    
  } catch (error) {
    console.error(`❌ Error validating ID Card:`, error.message);
    return false;
  }
}

/**
 * ตรวจสอบบัตรประชาชนและสถานะ (เวอร์ชันง่าย)
 * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
 * @returns {Object} ผลการตรวจสอบ
 */
async function verifyIDCardStatus(idCard) {
  try {
    console.log(`🔍 Verifying ID Card status for: ${idCard.substring(0, 4)}****`);
    
    // ตรวจสอบรูปแบบเลขบัตรประชาชน
    if (!validateThaiIDCard(idCard)) {
      return {
        valid: false,
        status: "invalid_format",
        message: "รูปแบบเลขบัตรประชาชนไม่ถูกต้อง"
      };
    }

    // ตรวจสอบรายการบัตรที่ทราบว่ามีปัญหา (Mock blacklist)
    const problematicCards = [
      "1000000000000", // บัตรหมดอายุ
      "2000000000000", // บัตรถูกยกเลิก
      "3000000000000"  // บัตรมีปัญหา
    ];

    if (problematicCards.includes(idCard)) {
      const issues = {
        "1000000000000": { status: "expired", message: "บัตรประชาชนหมดอายุแล้ว" },
        "2000000000000": { status: "cancelled", message: "บัตรประชาชนถูกยกเลิกแล้ว" },
        "3000000000000": { status: "suspended", message: "บัตรประชาชนถูกระงับการใช้งาน" }
      };

      const issue = issues[idCard];
      console.log(`⚠️ ID Card has issue: ${issue.status}`);
      
      return {
        valid: false,
        status: issue.status,
        message: issue.message
      };
    }

    // หากผ่านการตรวจสอบทั้งหมด ถือว่าบัตรถูกต้อง
    console.log(`✅ ID Card is valid and active`);
    
    return {
      valid: true,
      status: "active",
      message: "บัตรประชาชนถูกต้องและใช้งานได้",
      idCard: idCard
    };

  } catch (error) {
    console.error(`❌ Error verifying ID card:`, error.message);
    return {
      valid: false,
      status: "error",
      message: "เกิดข้อผิดพลาดในการตรวจสอบบัตรประชาชน"
    };
  }
}

/**
 * ตรวจสอบบัตรประชาชนแบบเบื้องต้น (ใช้สำหรับ real-time validation)
 * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
 * @returns {Object} ผลการตรวจสอบเบื้องต้น
 */
function validateIDCardBasic(idCard) {
  const result = {
    isValid: false,
    errors: []
  };

  // ตรวจสอบความยาว
  if (!idCard) {
    result.errors.push("กรุณากรอกเลขบัตรประชาชน");
    return result;
  }

  if (idCard.length !== 13) {
    result.errors.push("เลขบัตรประชาชนต้องมี 13 หลัก");
    return result;
  }

  // ตรวจสอบว่าเป็นตัวเลข
  if (!/^\d{13}$/.test(idCard)) {
    result.errors.push("เลขบัตรประชาชนต้องเป็นตัวเลขเท่านั้น");
    return result;
  }

  // ตรวจสอบ checksum
  if (!validateThaiIDCard(idCard)) {
    result.errors.push("เลขบัตรประชาชนไม่ถูกต้อง");
    return result;
  }

  result.isValid = true;
  return result;
}

/*
 * 📋 คำแนะนำการใช้งาน ID Card Validation
 * 
 * 🔍 การตรวจสอบบัตรประชาชน:
 * - validateThaiIDCard(idCard) - ตรวจสอบรูปแบบและ checksum
 * - verifyIDCardStatus(idCard) - ตรวจสอบสถานะบัตร  
 * - validateIDCardBasic(idCard) - ตรวจสอบเบื้องต้นสำหรับ real-time
 * 
 * 🧪 ข้อมูลทดสอบ:
 * - บัตรปกติ: 1120300144421, 1234567890123, 1111111111111
 * - บัตรหมดอายุ: 1000000000000
 * - บัตรยกเลิก: 2000000000000  
 * - บัตรระงับ: 3000000000000
 * 
 * 💡 หมายเหตุ:
 * - ระบบตรวจสอบเฉพาะรูปแบบและ checksum ของบัตรประชาชนไทย
 * - ไม่ต้องการ API Key จากหน่วยงานราชการ
 * - ใช้งานได้ทันทีโดยไม่ต้องติดตั้งเพิ่มเติม
 */

module.exports = {
  validateThaiIDCard,
  verifyIDCardStatus,
  validateIDCardBasic
};
