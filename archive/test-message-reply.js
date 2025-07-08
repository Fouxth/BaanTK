// 🧪 Test Script สำหรับทดสอบการตอบกลับข้อความ LINE Bot
const axios = require('axios');

// Configuration
const TEST_CONFIG = {
  // URL ของ Firebase Functions (production)
  webhookUrl: 'https://us-central1-baan-tk.cloudfunctions.net/webhook',
  
  // Test user ID (mock)
  testUserId: 'U1234567890abcdef1234567890abcdef',
  
  // Test reply token (mock)
  testReplyToken: 'test-reply-token-12345',
  
  // LINE Channel Secret สำหรับ signature (ใช้ dummy สำหรับ test)
  channelSecret: 'dummy-secret-for-testing'
};

// สร้าง signature สำหรับ LINE webhook
function createSignature(body, secret) {
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
  return signature;
}

// สร้าง mock LINE webhook event
function createLineEvent(messageText, eventType = 'message') {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    source: {
      type: 'user',
      userId: TEST_CONFIG.testUserId
    },
    replyToken: TEST_CONFIG.testReplyToken
  };

  if (eventType === 'message') {
    event.message = {
      id: 'msg-' + Date.now(),
      type: 'text',
      text: messageText
    };
  } else if (eventType === 'postback') {
    event.postback = {
      data: messageText // สำหรับ postback ใช้ messageText เป็น data
    };
  } else if (eventType === 'follow') {
    // Follow event ไม่ต้องมี message
  }

  return event;
}

// ฟังก์ชันทดสอบการส่งข้อความ
async function testMessage(messageText, eventType = 'message') {
  try {
    console.log(`\n🧪 Testing ${eventType}: "${messageText}"`);
    console.log('='.repeat(50));
    
    // สร้าง LINE webhook payload
    const event = createLineEvent(messageText, eventType);
    const webhookBody = {
      events: [event]
    };
    
    const bodyString = JSON.stringify(webhookBody);
    const signature = createSignature(bodyString, TEST_CONFIG.channelSecret);
    
    console.log(`📤 Sending webhook to: ${TEST_CONFIG.webhookUrl}`);
    console.log(`📝 Event type: ${eventType}`);
    console.log(`👤 User ID: ${TEST_CONFIG.testUserId}`);
    console.log(`🔑 Signature: ${signature.substring(0, 20)}...`);
    
    // ส่ง request ไปยัง webhook
    const startTime = Date.now();
    const response = await axios.post(TEST_CONFIG.webhookUrl, webhookBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'User-Agent': 'LineBotSdk/1.0'
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Response received in ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Response data:`, response.data);
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      responseTime
    };
    
  } catch (error) {
    console.log(`❌ Test failed for "${messageText}"`);
    
    if (error.response) {
      console.log(`📊 HTTP Status: ${error.response.status}`);
      console.log(`📄 Error data:`, error.response.data);
      console.log(`📋 Headers:`, error.response.headers);
    } else if (error.request) {
      console.log(`📡 Network error - no response received`);
      console.log(`🔗 Request details:`, error.request);
    } else {
      console.log(`⚙️ Setup error:`, error.message);
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// ฟังก์ชันทดสอบหลายข้อความ
async function runAllTests() {
  console.log('🚀 เริ่มทดสอบ LINE Bot Auto-Reply');
  console.log(`⏰ ${new Date().toLocaleString('th-TH')}`);
  console.log('='.repeat(70));
  
  const testCases = [
    // Basic greetings
    { text: 'สวัสดี', type: 'message', description: 'การทักทาย' },
    { text: 'hello', type: 'message', description: 'การทักทายภาษาอังกฤษ' },
    
    // Menu requests  
    { text: 'เมนู', type: 'message', description: 'เรียกดูเมนู' },
    { text: 'help', type: 'message', description: 'ขอความช่วยเหลือ' },
    
    // Service requests
    { text: 'สมัครสินเชื่อ', type: 'message', description: 'ขอสมัครสินเชื่อ' },
    { text: 'ตรวจสอบสถานะ', type: 'message', description: 'ตรวจสอบสถานะ' },
    { text: 'ติดต่อเจ้าหน้าที่', type: 'message', description: 'ติดต่อเจ้าหน้าที่' },
    
    // Postback events
    { text: 'action=register', type: 'postback', description: 'ปุ่มสมัครสินเชื่อ' },
    { text: 'action=menu', type: 'postback', description: 'ปุ่มเมนู' },
    { text: 'action=check_status', type: 'postback', description: 'ปุ่มตรวจสอบสถานะ' },
    
    // Follow event
    { text: '', type: 'follow', description: 'ผู้ใช้เพิ่มเพื่อน' },
    
    // Unknown message
    { text: 'ข้อความไม่รู้จัก', type: 'message', description: 'ข้อความที่ไม่รู้จัก' }
  ];
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Test ${i + 1}/${testCases.length}: ${testCase.description}`);
    
    const result = await testMessage(testCase.text, testCase.type);
    results.push({
      ...testCase,
      result
    });
    
    // รอสักครู่ระหว่างการทดสอบ
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // สรุปผลการทดสอบ
  console.log('\n📊 สรุปผลการทดสอบ');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  console.log(`✅ สำเร็จ: ${successful.length}/${results.length}`);
  console.log(`❌ ล้มเหลว: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ รายการที่ล้มเหลว:');
    failed.forEach(test => {
      console.log(`- ${test.description}: ${test.result.error || 'Unknown error'}`);
    });
  }
  
  if (successful.length > 0) {
    const avgResponseTime = successful.reduce((sum, test) => 
      sum + (test.result.responseTime || 0), 0) / successful.length;
    console.log(`⚡ เวลาตอบสนองเฉลี่ย: ${avgResponseTime.toFixed(0)}ms`);
  }
  
  return results;
}

// ฟังก์ชันทดสอบการเชื่อมต่อ Firebase Functions
async function testConnection() {
  try {
    console.log('🔗 ทดสอบการเชื่อมต่อ Firebase Functions...');
    
    const response = await axios.get(TEST_CONFIG.webhookUrl.replace('/lineWebhook', ''), {
      timeout: 5000
    });
    
    console.log(`✅ การเชื่อมต่อสำเร็จ - Status: ${response.status}`);
    return true;
  } catch (error) {
    console.log(`❌ การเชื่อมต่อล้มเหลว:`, error.message);
    return false;
  }
}

// ฟังก์ชันหลักในการรัน test
async function main() {
  try {
    console.log('🔧 LINE Bot Auto-Reply Test Suite');
    console.log('📅 วันที่:', new Date().toLocaleDateString('th-TH'));
    
    // ทดสอบการเชื่อมต่อก่อน
    console.log('\n1️⃣ ทดสอบการเชื่อมต่อ...');
    const connectionOk = await testConnection();
    
    if (!connectionOk) {
      console.log('❌ ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบ URL และการ deploy');
      return;
    }
    
    console.log('\n2️⃣ ทดสอบ Webhook และ Auto-Reply...');
    const results = await runAllTests();
    
    console.log('\n✅ การทดสอบเสร็จสิ้น');
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// เรียกใช้งาน
if (require.main === module) {
  main();
}

module.exports = {
  testMessage,
  runAllTests,
  testConnection
};
