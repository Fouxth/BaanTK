// 🧪 ทดสอบระบบการตอบกลับ LINE Bot - BaanTK
const { processLineEvent, sendPushMessage } = require('./functions/line-auto-reply.js');

// ข้อมูลทดสอบ
const TEST_USER_ID = "U1234567890abcdef1234567890abcdef1"; // User ID ทดสอบ
const TEST_REPLY_TOKEN = "test-reply-token-12345"; // Reply Token ทดสอบ

// ฟังก์ชันสำหรับสร้าง Mock Event
function createMockEvent(type, messageText = null, postbackData = null, replyToken = TEST_REPLY_TOKEN) {
  const baseEvent = {
    type,
    timestamp: Date.now(),
    source: {
      type: "user",
      userId: TEST_USER_ID
    },
    replyToken
  };

  if (type === "message" && messageText) {
    return {
      ...baseEvent,
      message: {
        type: "text",
        text: messageText,
        id: `msg-${Date.now()}`
      }
    };
  }

  if (type === "postback" && postbackData) {
    return {
      ...baseEvent,
      postback: {
        data: postbackData
      }
    };
  }

  if (type === "follow") {
    return baseEvent;
  }

  return baseEvent;
}

// ฟังก์ชันทดสอบการตอบกลับข้อความต่างๆ
async function testMessageReplies() {
  console.log("🧪 === ทดสอบการตอบกลับข้อความ LINE Bot ===\n");

  const testCases = [
    { type: "message", text: "สวัสดี", description: "ทักทาย" },
    { type: "message", text: "เมนู", description: "ขอดูเมนู" },
    { type: "message", text: "สมัครสินเชื่อ", description: "สมัครสินเชื่อ" },
    { type: "message", text: "ตรวจสอบสถานะ", description: "ตรวจสอบสถานะ" },
    { type: "message", text: "ส่งสลิป", description: "ส่งหลักฐานการชำระ" },
    { type: "message", text: "ติดต่อเจ้าหน้าที่", description: "ติดต่อ" },
    { type: "message", text: "เงื่อนไขการให้บริการ", description: "ดูเงื่อนไข" },
    { type: "message", text: "เกี่ยวกับบริษัท", description: "เกี่ยวกับเรา" },
    { type: "message", text: "hello", description: "ทักทายภาษาอังกฤษ" },
    { type: "message", text: "ขอความช่วยเหลือ", description: "ขอความช่วยเหลือ" },
    { type: "message", text: "ไม่เข้าใจ xyz abc", description: "ข้อความที่ไม่เข้าใจ" }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${i + 1}. 📱 ทดสอบ: ${testCase.description}`);
    console.log(`   ข้อความ: "${testCase.text}"`);
    
    try {
      const event = createMockEvent(testCase.type, testCase.text);
      const result = await processLineEvent(event);
      
      if (result && result.success) {
        console.log(`   ✅ ตอบกลับสำเร็จ:`, {
          messageType: result.messageType || 'text',
          messagesSent: result.messagesSent || 1
        });
      } else {
        console.log(`   ❌ ตอบกลับไม่สำเร็จ:`, result?.error || 'Unknown error');
      }
    } catch (error) {
      console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    
    // รอสักครู่เพื่อไม่ให้เรียก API เร็วเกินไป
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ฟังก์ชันทดสอบ Postback Events
async function testPostbackEvents() {
  console.log("\n\n🧪 === ทดสอบ Postback Events ===\n");

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
    const test = postbackTests[i];
    console.log(`\n${i + 1}. 🔘 ทดสอบ: ${test.description}`);
    console.log(`   Postback Data: "${test.data}"`);
    
    try {
      const event = createMockEvent("postback", null, test.data);
      const result = await processLineEvent(event);
      
      if (result && result.success) {
        console.log(`   ✅ ตอบกลับสำเร็จ:`, {
          messageType: result.messageType || 'text',
          messagesSent: result.messagesSent || 1
        });
      } else {
        console.log(`   ❌ ตอบกลับไม่สำเร็จ:`, result?.error || 'Unknown error');
      }
    } catch (error) {
      console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ฟังก์ชันทดสอบ Follow/Unfollow Events
async function testFollowEvents() {
  console.log("\n\n🧪 === ทดสอบ Follow/Unfollow Events ===\n");

  console.log("1. 👋 ทดสอบ: ผู้ใช้เพิ่มเพื่อน (Follow Event)");
  try {
    const followEvent = createMockEvent("follow");
    const result = await processLineEvent(followEvent);
    
    if (result && result.success) {
      console.log(`   ✅ ประมวลผล Follow Event สำเร็จ`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Display Name: ${result.displayName || 'ไม่สามารถดึงข้อมูลได้ (mock test)'}`);
    } else {
      console.log(`   ❌ ประมวลผล Follow Event ไม่สำเร็จ:`, result?.error);
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("\n2. 👋 ทดสอบ: ผู้ใช้ยกเลิกเพื่อน (Unfollow Event)");
  try {
    const unfollowEvent = createMockEvent("unfollow");
    const result = await processLineEvent(unfollowEvent);
    
    if (result && result.success) {
      console.log(`   ✅ ประมวลผล Unfollow Event สำเร็จ`);
      console.log(`   User ID: ${result.userId}`);
    } else {
      console.log(`   ❌ ประมวลผล Unfollow Event ไม่สำเร็จ:`, result?.error);
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ฟังก์ชันทดสอบการส่ง Push Message
async function testPushMessage() {
  console.log("\n\n🧪 === ทดสอบการส่ง Push Message ===\n");

  console.log("📤 ทดสอบ: ส่ง Push Message");
  console.log(`Target User ID: ${TEST_USER_ID}`);
  
  const messages = [
    "🔔 นี่คือข้อความทดสอบจากระบบ BaanTK",
    "📱 การทดสอบ Push Message ทำงานปกติ",
    "✅ ระบบพร้อมใช้งาน!"
  ];

  try {
    const result = await sendPushMessage(TEST_USER_ID, messages);
    
    if (result && result.success) {
      console.log(`   ✅ ส่ง Push Message สำเร็จ`);
      console.log(`   จำนวนข้อความ: ${messages.length}`);
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. "${msg}"`);
      });
    } else {
      console.log(`   ❌ ส่ง Push Message ไม่สำเร็จ:`, result?.error);
    }
  } catch (error) {
    console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
  }
}

// ฟังก์ชันสำหรับทดสอบการประมวลผล ID Card
async function testIdCardProcessing() {
  console.log("\n\n🧪 === ทดสอบการประมวลผลเลขบัตรประชาชน ===\n");

  const idCardTests = [
    "1234567890123",
    "1-2345-67890-12-3",
    "เลขบัตรประชาชน 1234567890123",
    "ID: 1234567890123",
    "บัตรประชาชนเลขที่ 1-2345-67890-12-3"
  ];

  for (let i = 0; i < idCardTests.length; i++) {
    const idText = idCardTests[i];
    console.log(`\n${i + 1}. 🆔 ทดสอบ: เลขบัตรประชาชน`);
    console.log(`   ข้อความ: "${idText}"`);
    
    try {
      const event = createMockEvent("message", idText);
      const result = await processLineEvent(event);
      
      if (result && result.success) {
        console.log(`   ✅ ประมวลผลสำเร็จ`);
      } else {
        console.log(`   ❌ ประมวลผลไม่สำเร็จ:`, result?.error);
      }
    } catch (error) {
      console.log(`   ❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ฟังก์ชันแสดงสถิติการทดสอบ
function showTestSummary() {
  console.log("\n\n📊 === สรุปการทดสอบ ===");
  console.log("🔧 ระบบที่ทดสอบ:");
  console.log("   • การตอบกลับข้อความต่างๆ");
  console.log("   • Postback Events (ปุ่มต่างๆ)");
  console.log("   • Follow/Unfollow Events");
  console.log("   • Push Message");
  console.log("   • การประมวลผลเลขบัตรประชาชน");
  
  console.log("\n💡 หมายเหตุ:");
  console.log("   • การทดสอบนี้ใช้ Mock Data (ข้อมูลจำลอง)");
  console.log("   • ในการใช้งานจริง ต้องมี LINE Token และ User ID จริง");
  console.log("   • ต้อง Deploy ไปยัง Server และตั้งค่า Webhook");
  
  console.log("\n🚀 ขั้นตอนต่อไป:");
  console.log("   1. Deploy ระบบไปยัง Firebase Functions");
  console.log("   2. ตั้งค่า Webhook URL ใน LINE Developers Console");
  console.log("   3. ทดสอบกับ User ID จริง");
  console.log("   4. Monitor logs และปรับปรุงระบบ");
}

// ฟังก์ชันหลักสำหรับรันการทดสอบทั้งหมด
async function runAllTests() {
  console.log("🎯 เริ่มการทดสอบระบบการตอบกลับ LINE Bot - BaanTK");
  console.log("=" .repeat(60));
  
  try {
    // ทดสอบการตอบกลับข้อความ
    await testMessageReplies();
    
    // ทดสอบ Postback Events
    await testPostbackEvents();
    
    // ทดสอบ Follow/Unfollow Events
    await testFollowEvents();
    
    // ทดสอบ Push Message (อาจจะล้มเหลวถ้าไม่มี Token จริง)
    await testPushMessage();
    
    // ทดสอบการประมวลผลเลขบัตรประชาชน
    await testIdCardProcessing();
    
    // แสดงสรุป
    showTestSummary();
    
    console.log("\n✅ การทดสอบระบบการตอบกลับเสร็จสิ้น!");
    
  } catch (error) {
    console.error("\n❌ เกิดข้อผิดพลาดในการทดสอบ:", error);
  }
}

// เรียกใช้งานเมื่อไฟล์ถูกรันโดยตรง
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testMessageReplies,
  testPostbackEvents,
  testFollowEvents,
  testPushMessage,
  testIdCardProcessing,
  createMockEvent
};
