// 🔐 Authentication Middleware Module
const securityService = require("../security");

// Use centralized authentication from security service
function authenticateAdmin(req, res, next) {
  return securityService.authenticateAdmin(req, res, next);
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

module.exports = {
  authenticateAdmin,
  authenticateUser
};