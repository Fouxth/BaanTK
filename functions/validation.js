// Production-grade Input Validation Module
const joi = require("joi");
const validator = require("validator");

class ValidationService {
  // Thai ID Card validation schema
  getThaiIDSchema() {
    return joi.string()
      .length(13)
      .pattern(/^\d+$/)
      .custom((value, helpers) => {
        if (!this.validateThaiIDChecksum(value)) {
          return helpers.error("thaiId.invalid");
        }
        return value;
      })
      .messages({
        "thaiId.invalid": "รหัสบัตรประชาชนไม่ถูกต้อง"
      });
  }

  // Registration validation schema
  getRegistrationSchema() {
    return joi.object({
      firstName: joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[ก-๙a-zA-Z\s]+$/)
        .required()
        .messages({
          "string.pattern.base": "ชื่อต้องเป็นภาษาไทยหรืออังกฤษเท่านั้น",
          "string.min": "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร",
          "string.max": "ชื่อต้องไม่เกิน 50 ตัวอักษร"
        }),

      lastName: joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[ก-๙a-zA-Z\s]+$/)
        .required()
        .messages({
          "string.pattern.base": "นามสกุลต้องเป็นภาษาไทยหรืออังกฤษเท่านั้น",
          "string.min": "นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร",
          "string.max": "นามสกุลต้องไม่เกิน 50 ตัวอักษร"
        }),

      birthDate: joi.string()
        .pattern(/^\d{2}\/\d{2}\/\d{4}$/)
        .custom((value, helpers) => {
          const age = this.calculateAge(value);
          if (age < 18 || age > 80) {
            return helpers.error("age.invalid");
          }
          return value;
        })
        .required()
        .messages({
          "string.pattern.base": "วันเกิดต้องอยู่ในรูปแบบ DD/MM/YYYY",
          "age.invalid": "อายุต้องอยู่ระหว่าง 18-80 ปี"
        }),

      idCard: this.getThaiIDSchema().required(),

      address: joi.string()
        .trim()
        .min(10)
        .max(200)
        .required()
        .messages({
          "string.min": "ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร",
          "string.max": "ที่อยู่ต้องไม่เกิน 200 ตัวอักษร"
        }),

      // ที่อยู่ตามบัตรประชาชน
      addressOnId: joi.string()
        .trim()
        .min(10)
        .max(200)
        .optional()
        .messages({
          "string.min": "ที่อยู่ตามบัตรต้องมีอย่างน้อย 10 ตัวอักษร",
          "string.max": "ที่อยู่ตามบัตรต้องไม่เกิน 200 ตัวอักษร"
        }),

      // ที่อยู่ปัจจุบัน
      currentAddress: joi.string()
        .trim()
        .min(10)
        .max(200)
        .optional()
        .messages({
          "string.min": "ที่อยู่ปัจจุบันต้องมีอย่างน้อย 10 ตัวอักษร",
          "string.max": "ที่อยู่ปัจจุบันต้องไม่เกิน 200 ตัวอักษร"
        }),

      // รูปบัตรประชาชน
      idCardImage: joi.string()
        .optional()
        .custom((value, helpers) => {
          if (value && !value.startsWith("data:image/")) {
            return helpers.error("image.invalid");
          }
          return value;
        })
        .messages({
          "image.invalid": "รูปบัตรประชาชนไม่ถูกต้อง"
        }),

      idCardImageName: joi.string().optional(),
      idCardImageSize: joi.number().optional(),

      // รูปถ่ายผู้กู้
      selfieImage: joi.string()
        .optional()
        .custom((value, helpers) => {
          if (value && !value.startsWith("data:image/")) {
            return helpers.error("image.invalid");
          }
          return value;
        })
        .messages({
          "image.invalid": "รูปถ่ายผู้กู้ไม่ถูกต้อง"
        }),

      selfieImageName: joi.string().optional(),
      selfieImageSize: joi.number().optional(),

      amount: joi.number()
        .min(100)
        .max(50000)
        .required()
        .messages({
          "number.min": "จำนวนเงินกู้ต้องไม่น้อยกว่า 100 บาท",
          "number.max": "จำนวนเงินกู้ต้องไม่เกิน 50,000 บาท"
        }),

      frequency: joi.string()
        .valid("daily", "weekly", "monthly")
        .required()
        .messages({
          "any.only": "ระยะเวลาชำระต้องเป็น daily, weekly, หรือ monthly เท่านั้น"
        }),

      userId: joi.string()
        .trim()
        .min(10)
        .max(100)
        .required()
        .messages({
          "string.min": "User ID ไม่ถูกต้อง",
          "string.max": "User ID ไม่ถูกต้อง"
        }),

      phoneNumber: joi.string()
        .pattern(/^0[0-9]{9}$/)
        .optional()
        .messages({
          "string.pattern.base": "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 10 หลัก)"
        }),

      email: joi.string()
        .email()
        .optional()
        .messages({
          "string.email": "อีเมลไม่ถูกต้อง"
        })
    });
  }

  // Admin action validation schema
  getAdminActionSchema() {
    return joi.object({
      borrowerId: joi.string()
        .trim()
        .required()
        .messages({
          "string.empty": "Borrower ID is required"
        }),

      action: joi.string()
        .valid("approve", "reject")
        .required()
        .messages({
          "any.only": "Action must be approve or reject"
        }),

      notes: joi.string()
        .max(500)
        .optional()
        .messages({
          "string.max": "Notes must not exceed 500 characters"
        })
    });
  }

  // Blacklist validation schema
  getBlacklistSchema() {
    return joi.object({
      idCard: joi.string()
        .length(13)
        .pattern(/^\d+$/)
        .optional(),

      userId: joi.string()
        .trim()
        .min(5)
        .optional(),

      reason: joi.string()
        .max(200)
        .required()
        .messages({
          "string.max": "Reason must not exceed 200 characters"
        }),

      firstName: joi.string()
        .max(50)
        .optional(),

      lastName: joi.string()
        .max(50)
        .optional()
    }).or("idCard", "userId")
      .messages({
        "object.missing": "Either idCard or userId must be provided"
      });
  }

  // Validate Thai ID Card checksum
  validateThaiIDChecksum(idCard) {
    if (idCard.length !== 13) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(idCard[i]) * (13 - i);
    }

    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(idCard[12]);
  }

  // Calculate age from birth date string (DD/MM/YYYY)
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

  // Sanitize input to prevent XSS
  sanitizeInput(input) {
    if (typeof input === "string") {
      return validator.escape(input.trim());
    }

    if (typeof input === "object" && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  // Validate and sanitize registration data
  validateRegistration(data) {
    const schema = this.getRegistrationSchema();
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map((detail) => detail.message),
        data: null
      };
    }

    return {
      isValid: true,
      errors: [],
      data: this.sanitizeInput(value)
    };
  }

  // Validate admin action
  validateAdminAction(data) {
    const schema = this.getAdminActionSchema();
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map((detail) => detail.message),
        data: null
      };
    }

    return {
      isValid: true,
      errors: [],
      data: this.sanitizeInput(value)
    };
  }

  // Validate blacklist data
  validateBlacklist(data) {
    const schema = this.getBlacklistSchema();
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map((detail) => detail.message),
        data: null
      };
    }

    return {
      isValid: true,
      errors: [],
      data: this.sanitizeInput(value)
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
    if (!startDate && !endDate) {
      return { isValid: true, start: null, end: null };
    }

    try {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && isNaN(start.getTime())) {
        return { isValid: false, error: "Invalid start date" };
      }

      if (end && isNaN(end.getTime())) {
        return { isValid: false, error: "Invalid end date" };
      }

      if (start && end && start > end) {
        return { isValid: false, error: "Start date must be before end date" };
      }

      return { isValid: true, start, end };
    } catch (error) {
      return { isValid: false, error: "Invalid date format" };
    }
  }
}

module.exports = new ValidationService();
