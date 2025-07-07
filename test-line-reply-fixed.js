// 🧪 การทดสอบระบบตอบกลับ LINE Bot - BaanTK (Fixed Version)
const lineModule = require('./functions/line-auto-reply.js');

console.log("🎯 เริ่มการทดสอบระบบการตอบกลับ LINE Bot - BaanTK (Fixed)");
console.log("============================================================");

// Mock User ID สำหรับการทดสอบ
const TEST_USER_ID = "U1234567890abcdef1234567890abcdef1";
const TEST_REPLY_TOKEN = "reply-token-for-testing";

async function testDirectFunctions() {
  console.log("\n🧪 === ทดสอบการเรียกใช้ Function โดยตรง ===\n");
  
  const testCases = [
    { message: "สวัสดี", description: "ทักทาย" },
    { message: "เมนู", description: "ขอดูเมนู" },
    { message: "สมัครสินเชื่อ", description: "สมัครสินเชื่อ" },
    { message: "ตรวจสอบสถานะ", description: "ตรวจสอบสถานะ" },
    { message: "ส่งสลิป", description: "ส่งหลักฐานการชำระ" },
    { message: "ติดต่อเจ้าหน้าที่", description: "ติดต่อ" },
    { message: "เงื่อนไขการให้บริการ", description: "ดูเงื่อนไข" },
    { message: "เกี่ยวกับบริษัท", description: "เกี่ยวกับเรา" },
    { message: "hello", description: "ทักทายภาษาอังกฤษ" },
    { message: "ขอความช่วยเหลือ", description: "ขอความช่วยเหลือ" },
    { message: "ไม่เข้าใจ xyz abc", description: "ข้อความที่ไม่เข้าใจ" }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const { message, description } = testCases[i];
    console.log(`${i + 1}. 📱 ทดสอบ: ${description}`);
    console.log(`   ข้อความ: "${message}"`);
    
    try {
      const result = await lineModule.processLineMessage(TEST_USER_ID, message, TEST_REPLY_TOKEN);
      
      if (result && result.success) {
        console.log(`   ✅ ประมวลผลสำเร็จ`);
        if (result.reply && result.reply.length > 0) {
          console.log(`   💬 คำตอบ: ${result.reply[0].substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ ประมวลผลไม่สำเร็จ: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    console.log();
  }
}

async function testPostbackFunctions() {
  console.log("\n🧪 === ทดสอบ Postback Events (Direct Function Call) ===\n");
  
  const postbackTests = [
    { data: "action=register", description: "กดปุ่มสมัครสินเชื่อ" },
    { data: "action=menu", description: "กดปุ่มเมนู" },
    { data: "action=check_status", description: "กดปุ่มตรวจสอบสถานะ" },
    { data: "action=payment", description: "กดปุ่มส่งสลิป" },
    { data: "action=contact", description: "กดปุ่มติดต่อ" },
    { data: "action=terms", description: "กดปุ่มเงื่อนไข" },
    { data: "action=about", description: "กดปุ่มเกี่ยวกับเรา" }
  ];

  for (let i = 0; i < postbackTests.length; i++) {
    const { data, description } = postbackTests[i];
    console.log(`${i + 1}. 🔘 ทดสอบ: ${description}`);
    console.log(`   Postback Data: "${data}"`);
    
    try {
      const result = await lineModule.processPostbackEvent(TEST_USER_ID, data, TEST_REPLY_TOKEN);
      
      if (result && result.success) {
        console.log(`   ✅ ประมวลผลสำเร็จ`);
        if (result.reply && result.reply.length > 0) {
          console.log(`   💬 คำตอบ: ${result.reply[0].substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ ประมวลผลไม่สำเร็จ: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    console.log();
  }
}

async function testNotificationFunctions() {
  console.log("\n🧪 === ทดสอบการแจ้งเตือน ===\n");
  
  // ทดสอบการแจ้งเตือนอนุมัติสลิป
  console.log("1. 📋 ทดสอบ: แจ้งเตือนอนุมัติสลิป");
  try {
    const result = await lineModule.sendSlipApprovalNotification(
      TEST_USER_ID, 
      "approved", 
      { slipId: "slip123", amount: 5000, date: "2024-01-01" }
    );
    
    if (result && result.success) {
      console.log("   ✅ ส่งการแจ้งเตือนอนุมัติสลิปสำเร็จ");
    } else {
      console.log(`   ❌ ส่งการแจ้งเตือนไม่สำเร็จ: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }
  console.log();

  // ทดสอบการแจ้งเตือนสถานะการสมัคร
  console.log("2. 📝 ทดสอบ: แจ้งเตือนสถานะการสมัคร");
  try {
    const result = await lineModule.sendApplicationStatusNotification(
      TEST_USER_ID, 
      "approved", 
      { applicationId: "app123", loanAmount: 10000 }
    );
    
    if (result && result.success) {
      console.log("   ✅ ส่งการแจ้งเตือนสถานะการสมัครสำเร็จ");
    } else {
      console.log(`   ❌ ส่งการแจ้งเตือนไม่สำเร็จ: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }
  console.log();
}

async function testConfigurationAndMocks() {
  console.log("\n🧪 === ทดสอบการตั้งค่าและ Mock Functions ===\n");
  
  // ทดสอบการตั้งค่า LINE
  console.log("1. ⚙️ ทดสอบ: การตั้งค่า LINE Configuration");
  console.log(`   Access Token: ${lineModule.LINE_CONFIG.hasAccessToken ? '✅ มี' : '❌ ไม่มี'}`);
  console.log(`   Channel Secret: ${lineModule.LINE_CONFIG.hasSecret ? '✅ มี' : '❌ ไม่มี'}`);
  console.log(`   Token Length: ${lineModule.LINE_CONFIG.channelAccessToken?.length || 0} characters`);
  console.log();

  // ทดสอบ sendReply function (Mock)
  console.log("2. 💬 ทดสอบ: sendReply Function (Mock Mode)");
  try {
    const mockMessages = [
      { type: "text", text: "นี่คือข้อความทดสอบ" },
      { type: "text", text: "การทดสอบ sendReply ทำงานปกติ" }
    ];
    
    const result = await lineModule.sendReply(TEST_REPLY_TOKEN, mockMessages);
    
    if (result && result.success) {
      console.log("   ✅ sendReply ทำงานปกติ (Mock Mode)");
    } else {
      console.log(`   ❌ sendReply ไม่ทำงาน: ${result?.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }
  console.log();

  // ทดสอบ User States
  console.log("3. 👤 ทดสอบ: User States Management");
  try {
    if (lineModule.userStates) {
      lineModule.userStates.set(TEST_USER_ID, { 
        currentStep: "test", 
        data: { test: true } 
      });
      
      const userState = lineModule.userStates.get(TEST_USER_ID);
      if (userState && userState.currentStep === "test") {
        console.log("   ✅ User States จัดการได้ปกติ");
      } else {
        console.log("   ❌ User States ไม่ทำงานตามที่คาดหวัง");
      }
    } else {
      console.log("   ❌ User States ไม่พร้อมใช้งาน");
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }
  console.log();
}

async function runAllTests() {
  try {
    await testDirectFunctions();
    await testPostbackFunctions(); 
    await testNotificationFunctions();
    await testConfigurationAndMocks();
    
    console.log("📊 === สรุปการทดสอบ ===");
    console.log("🔧 ระบบที่ทดสอบ:");
    console.log("   • การตอบกลับข้อความต่างๆ (Direct Function Calls)");
    console.log("   • Postback Events (Direct Function Calls)");
    console.log("   • ระบบการแจ้งเตือน");
    console.log("   • การตั้งค่าและ Mock Functions");
    console.log("   • User States Management");
    console.log();
    console.log("💡 หมายเหตุ:");
    console.log("   • การทดสอบนี้ใช้ Mock Data และ Direct Function Calls");
    console.log("   • ใน Production ต้องมี LINE Token และ User ID จริง");
    console.log("   • ต้อง Deploy ไปยัง Firebase Functions และตั้งค่า Webhook");
    console.log("   • Error 401 ใน Push Message เป็นเรื่องปกติใน Test Environment");
    console.log();
    console.log("🚀 ขั้นตอนต่อไป:");
    console.log("   1. Deploy ระบบไปยัง Firebase Functions");
    console.log("   2. ตั้งค่า Webhook URL ใน LINE Developers Console");
    console.log("   3. ทดสอบกับ User ID และ Token จริง");
    console.log("   4. Monitor logs และปรับปรุงระบบ");
    console.log();
    console.log("✅ การทดสอบระบบการตอบกลับเสร็จสิ้น!");
    
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการทดสอบ:", error);
  }
}

// เรียกใช้การทดสอบ
runAllTests();
