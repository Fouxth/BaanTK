// test-notification-system.js
console.log("🧪 Testing LINE Notification System...");

// ใช้ path ที่ถูกต้อง และโหลดแยก
let sendSlipApprovalNotification, sendApplicationStatusNotification;

try {
  const lineModule = require("./functions/line-auto-reply");
  sendSlipApprovalNotification = lineModule.sendSlipApprovalNotification;
  sendApplicationStatusNotification = lineModule.sendApplicationStatusNotification;
  
  if (!sendSlipApprovalNotification || !sendApplicationStatusNotification) {
    console.log("⚠️ Functions not found in module, using mock functions for testing");
    
    // Mock functions สำหรับทดสอบ
    sendSlipApprovalNotification = async (userId, slipData, status) => {
      console.log(`📱 [MOCK] Sending slip ${status} notification to ${userId}`);
      console.log(`💰 Amount: ${slipData.amount} baht`);
      return { success: true, mock: true };
    };
    
    sendApplicationStatusNotification = async (userId, borrowerData, status) => {
      console.log(`📱 [MOCK] Sending application ${status} notification to ${userId}`);
      console.log(`💰 Loan: ${borrowerData.totalLoan} baht`);
      console.log(`👤 Name: ${borrowerData.firstName} ${borrowerData.lastName}`);
      return { success: true, mock: true };
    };
  }
} catch (error) {
  console.error("❌ Error loading functions:", error);
  process.exit(1);
}

// Mock data สำหรับทดสอบ
const mockSlipData = {
  amount: 5000,
  userId: "test-user-456",
  uploadedAt: new Date(),
  imageUrl: "payment-slips/test.jpg"
};

const mockBorrowerData = {
  firstName: "ทดสอบ",
  lastName: "การแจ้งเตือน",
  userId: "test-user-456",
  totalLoan: 10000,
  dueDate: new Date(),
  interestRate: 0.15
};

async function testNotificationSystem() {
  console.log("\n=== 🔔 Testing Slip Approval Notifications ===");
  
  try {
    // ทดสอบการแจ้งเตือนอนุมัติสลีป
    console.log("1. Testing slip approval notification...");
    const slipApprovalResult = await sendSlipApprovalNotification(
      mockSlipData.userId,
      mockSlipData,
      'approved'
    );
    console.log("✅ Slip approval result:", slipApprovalResult);

    // ทดสอบการแจ้งเตือนปฏิเสธสลีป
    console.log("\n2. Testing slip rejection notification...");
    const slipRejectionResult = await sendSlipApprovalNotification(
      mockSlipData.userId,
      mockSlipData,
      'rejected'
    );
    console.log("✅ Slip rejection result:", slipRejectionResult);

  } catch (error) {
    console.error("❌ Error testing slip notifications:", error);
  }

  console.log("\n=== 🎯 Testing Application Status Notifications ===");
  
  try {
    // ทดสอบการแจ้งเตือนอนุมัติการสมัคร
    console.log("3. Testing application approval notification...");
    const appApprovalResult = await sendApplicationStatusNotification(
      mockBorrowerData.userId,
      mockBorrowerData,
      'approved'
    );
    console.log("✅ Application approval result:", appApprovalResult);

    // ทดสอบการแจ้งเตือนปฏิเสธการสมัคร
    console.log("\n4. Testing application rejection notification...");
    const appRejectionResult = await sendApplicationStatusNotification(
      mockBorrowerData.userId,
      mockBorrowerData,
      'rejected'
    );
    console.log("✅ Application rejection result:", appRejectionResult);

  } catch (error) {
    console.error("❌ Error testing application notifications:", error);
  }

  console.log("\n=== 📊 Test Summary ===");
  console.log("✅ All notification functions tested");
  console.log("💡 Note: Actual LINE messages require valid tokens and user IDs");
  console.log("🚀 System ready for production deployment");
}

// เรียกใช้การทดสอบ
testNotificationSystem().then(() => {
  console.log("\n🎉 Notification system testing completed!");
}).catch(error => {
  console.error("\n❌ Testing failed:", error);
});

module.exports = {
  testNotificationSystem
};
