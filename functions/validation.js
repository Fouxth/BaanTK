// 🔍 Input Validation Service Module
const governmentAPI = require("./governmentAPI");

class ValidationService {
  // Validate registration input
  validateRegistration(data) {
    const errors = [];
    const sanitized = {};

    // Required fields validation - ปรับให้รองรับ addressOnId และ currentAddress
    const requiredFields = ["firstName", "lastName", "birthDate", "idCard", "amount", "frequency", "userId"];
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === "") {
        errors.push(`${field} is required`);
      }
    }

    // Check address - accept either 'address', 'addressOnId', or 'currentAddress'
    if (!data.address && !data.addressOnId && !data.currentAddress) {
      errors.push("address is required");
    }

    if (errors.length > 0) {
      return { isValid: false, errors, data: null };
    }

    // Sanitize and validate each field
    sanitized.firstName = String(data.firstName).trim().substring(0, 50);
    sanitized.lastName = String(data.lastName).trim().substring(0, 50);
    
    // Handle address fields - use addressOnId as primary, fallback to currentAddress or address
    sanitized.address = String(data.addressOnId || data.currentAddress || data.address).trim().substring(0, 200);
    sanitized.addressOnId = data.addressOnId ? String(data.addressOnId).trim().substring(0, 200) : sanitized.address;
    sanitized.currentAddress = data.currentAddress ? String(data.currentAddress).trim().substring(0, 200) : sanitized.address;
    
    sanitized.userId = String(data.userId).trim();

    // Validate Thai ID Card (13 digits + checksum)
    const idCard = String(data.idCard).replace(/\D/g, "");
    if (idCard.length !== 13) {
      errors.push("เลขบัตรประชาชนต้องมี 13 หลัก");
    }
    sanitized.idCard = idCard;

    // Validate birth date - รองรับทั้ง DD/MM/YYYY และ YYYY-MM-DD
    let birthDateMatch = String(data.birthDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/YYYY
    let day, month, year;
    
    if (!birthDateMatch) {
      // ลองรูปแบบ YYYY-MM-DD (HTML date input)
      const isoDateMatch = String(data.birthDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        [, year, month, day] = isoDateMatch;
        birthDateMatch = true; // set flag to proceed with validation
      } else {
        errors.push("วันเกิดต้องอยู่ในรูปแบบ DD/MM/YYYY หรือ YYYY-MM-DD");
      }
    } else {
      [, day, month, year] = birthDateMatch;
    }
    
    if (birthDateMatch) {
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      
      // Adjust age if birthday hasn't occurred this year
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18 || age > 80) {
        errors.push("อายุต้องอยู่ระหว่าง 18-80 ปี");
      }
      sanitized.birthDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }

    // Validate loan amount
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount < 100 || amount > 50000) {
      errors.push("จำนวนเงินกู้ต้องอยู่ระหว่าง 100-50,000 บาท");
    }
    sanitized.amount = amount;

    // Validate frequency
    if (!["daily", "weekly", "monthly"].includes(data.frequency)) {
      errors.push("ความถี่การชำระไม่ถูกต้อง");
    }
    sanitized.frequency = data.frequency;

    // Copy other fields
    Object.keys(data).forEach(key => {
      if (!sanitized.hasOwnProperty(key) && data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? sanitized : null
    };
  }

  // Validate blacklist input
  validateBlacklist(data) {
    const errors = [];
    const sanitized = {};

    // Must have either idCard or userId
    if (!data.idCard && !data.userId) {
      errors.push("ต้องระบุเลขบัตรประชาชนหรือ User ID");
    }

    if (data.idCard) {
      const idCard = String(data.idCard).replace(/\D/g, "");
      if (idCard.length !== 13) {
        errors.push("เลขบัตรประชาชนต้องมี 13 หลัก");
      }
      sanitized.idCard = idCard;
    }

    if (data.userId) {
      sanitized.userId = String(data.userId).trim();
    }

    if (!data.reason || String(data.reason).trim() === "") {
      errors.push("ต้องระบุเหตุผลในการเพิ่มเข้าบัญชีดำ");
    } else {
      sanitized.reason = String(data.reason).trim().substring(0, 500);
    }

    sanitized.firstName = data.firstName ? String(data.firstName).trim().substring(0, 50) : "";
    sanitized.lastName = data.lastName ? String(data.lastName).trim().substring(0, 50) : "";

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? sanitized : null
    };
  }

  // Validate admin action
  validateAdminAction(data) {
    const errors = [];
    const sanitized = {};

    if (!data.borrowerId || String(data.borrowerId).trim() === "") {
      errors.push("ต้องระบุ Borrower ID");
    } else {
      sanitized.borrowerId = String(data.borrowerId).trim();
    }

    if (!data.action || !["approve", "reject"].includes(data.action)) {
      errors.push("การดำเนินการต้องเป็น approve หรือ reject");
    } else {
      sanitized.action = data.action;
    }

    sanitized.notes = data.notes ? String(data.notes).trim().substring(0, 1000) : "";

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? sanitized : null
    };
  }

  // Validate pagination parameters
  validatePagination(page, limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    return {
      page: Math.max(1, pageNum),
      limit: Math.min(100, Math.max(1, limitNum)) // Max 100 items per page
    };
  }

  // Validate date range
  validateDateRange(startDate, endDate) {
    const result = { isValid: true, start: null, end: null };

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return { isValid: false, error: "วันที่เริ่มต้นไม่ถูกต้อง" };
      }
      result.start = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return { isValid: false, error: "วันที่สิ้นสุดไม่ถูกต้อง" };
      }
      result.end = end;
    }

    if (result.start && result.end && result.start > result.end) {
      return { isValid: false, error: "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด" };
    }

    return result;
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number (Thai format)
  validateThaiPhone(phone) {
    const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone);
  }

  // Sanitize HTML input
  sanitizeHtml(input) {
    if (!input) return "";
    return String(input)
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
}

module.exports = new ValidationService();
