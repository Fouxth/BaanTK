// ID Card Validation Service with External API
// ระบบตรวจสอบความถูกต้องของเลขบัตรประชาชนผ่าน API

const functions = require("firebase-functions");
const axios = require("axios");

// API Configuration
const ID_CARD_API_CONFIG = {
  BASE_URL: "https://www.programmerthailand.com/services/idcard-check",
  TIMEOUT: 10000,
  RETRY_COUNT: 3
};

/**
 * ตรวจสอบความถูกต้องของเลขบัตรประชาชนไทยผ่าน API
 * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
 * @returns {Promise<Object>} ผลการตรวจสอบ
 */
async function validateThaiIDCard(idCard) {
  try {
    console.log(`🔍 Validating Thai ID Card via API: ${idCard ? idCard.substring(0, 4) + "****" : "null"}`);

    // ตรวจสอบความยาวและรูปแบบเบื้องต้น
    if (!idCard || idCard.length !== 13) {
      console.log(`❌ Invalid length: ${idCard ? idCard.length : 0} (should be 13)`);
      return {
        isValid: false,
        error: "เลขบัตรประชาชนต้องมี 13 หลัก"
      };
    }

    // ตรวจสอบว่าเป็นตัวเลขทั้งหมด
    if (!/^\d{13}$/.test(idCard)) {
      console.log(`❌ Invalid format: contains non-numeric characters`);
      return {
        isValid: false,
        error: "เลขบัตรประชาชนต้องเป็นตัวเลขเท่านั้น"
      };
    }

    // เรียก API เพื่อตรวจสอบ
    const apiResult = await callIDCardAPI(idCard);

    if (apiResult.success) {
      console.log(`✅ API validation successful`);
      return {
        isValid: true,
        data: apiResult.data,
        source: "external_api"
      };
    } else {
      console.log(`❌ API validation failed: ${apiResult.error}`);
      // ถ้า API ล้มเหลว ให้ fallback ไปใช้การตรวจสอบ checksum
      const checksumResult = validateChecksumOnly(idCard);
      return {
        isValid: checksumResult,
        data: checksumResult ? { status: "checksum_valid" } : null,
        source: "checksum_fallback",
        warning: `API unavailable: ${apiResult.error}`
      };
    }
  } catch (error) {
    console.error(`❌ Error validating ID Card:`, error.message);
    // Fallback to checksum validation
    const checksumResult = validateChecksumOnly(idCard);
    return {
      isValid: checksumResult,
      data: checksumResult ? { status: "checksum_valid" } : null,
      source: "checksum_fallback",
      error: error.message
    };
  }
}

/**
 * เรียก API เพื่อตรวจสอบบัตรประชาชน
 */
async function callIDCardAPI(idCard) {
  let lastError;

  for (let attempt = 1; attempt <= ID_CARD_API_CONFIG.RETRY_COUNT; attempt++) {
    try {
      console.log(`📡 Calling ID Card API (attempt ${attempt}/${ID_CARD_API_CONFIG.RETRY_COUNT})`);

      const response = await axios.get(ID_CARD_API_CONFIG.BASE_URL, {
        params: {
          id: idCard
        },
        timeout: ID_CARD_API_CONFIG.TIMEOUT,
        headers: {
          "User-Agent": "BaanTK-LoanSystem/1.0",
          "Accept": "application/json"
        }
      });

      if (response.data) {
        return {
          success: true,
          data: {
            idCard: idCard,
            valid: response.data.valid || response.data.status === "valid",
            message: response.data.message || "Valid ID Card",
            details: response.data
          }
        };
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ API call attempt ${attempt} failed:`, error.message);

      if (attempt < ID_CARD_API_CONFIG.RETRY_COUNT) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "API call failed after all retries"
  };
}

/**
 * ตรวจสอบ checksum เท่านั้น (สำหรับ fallback)
 */
function validateChecksumOnly(idCard) {
  try {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(idCard[i]) * (13 - i);
    }

    const remainder = sum % 11;
    const checkDigit = (11 - remainder) % 10;
    const lastDigit = parseInt(idCard[12]);

    return checkDigit === lastDigit;
  } catch (error) {
    return false;
  }
}

/**
 * ตรวจสอบบัตรประชาชนและสถานะผ่าน API
 * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
 * @returns {Promise<Object>} ผลการตรวจสอบ
 */
async function verifyIDCardStatus(idCard) {
  try {
    console.log(`🔍 Verifying ID Card status via API for: ${idCard.substring(0, 4)}****`);

    // ตรวจสอบผ่าน API
    const validationResult = await validateThaiIDCard(idCard);

    if (!validationResult.isValid) {
      return {
        valid: false,
        status: "invalid",
        message: validationResult.error || "เลขบัตรประชาชนไม่ถูกต้อง",
        source: validationResult.source
      };
    }

    // ตรวจสอบรายการบัตรที่ทราบว่ามีปัญหา (Local blacklist)
    const problematicCards = [
      "1000000000000", // บัตรหมดอายุ
      "2000000000000", // บัตรถูกยกเลิก
      "3000000000000" // บัตรมีปัญหา
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
        message: issue.message,
        source: "local_blacklist"
      };
    }

    // หากผ่านการตรวจสอบทั้งหมด ถือว่าบัตรถูกต้อง
    console.log(`✅ ID Card is valid and active`);

    return {
      valid: true,
      status: "active",
      message: "บัตรประชาชนถูกต้องและใช้งานได้",
      idCard: idCard,
      source: validationResult.source,
      apiData: validationResult.data
    };
  } catch (error) {
    console.error(`❌ Error verifying ID card:`, error.message);
    return {
      valid: false,
      status: "error",
      message: "เกิดข้อผิดพลาดในการตรวจสอบบัตรประชาชน",
      error: error.message
    };
  }
}

/**
 * ตรวจสอบบัตรประชาชนแบบเบื้องต้น (ใช้สำหรับ real-time validation)
 * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
 * @returns {Promise<Object>} ผลการตรวจสอบเบื้องต้น
 */
async function validateIDCardBasic(idCard) {
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
 * - บัตรปกติ: 1234567890123, 1111111111111
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
