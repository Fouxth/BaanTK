// 🧪 Test Script สำหรับทดสอบการตรวจสอบสถานะด้วย Real User ID
const axios = require('axios');

// Configuration
const TEST_CONFIG = {
  webhookUrl: 'https://us-central1-baan-tk.cloudfunctions.net/webhook',
  // User ID จริงจาก logs
  realUserId: 'U79c0d4968f31138b09d6e71c3bcc5296',
  testReplyToken: 'test-reply-token-12345',
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
function createLineEvent(messageText, eventType = 'message', userId = TEST_CONFIG.realUserId) {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    source: {
      type: 'user',
      userId: userId
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
      data: messageText
    };
  }

  return event;
}

// ฟังก์ชันทดสอบการส่งข้อความ
async function testStatusCheck() {
  try {
    console.log('🔍 ทดสอบการตรวจสอบสถานะด้วย Real User ID');
    console.log(`👤 User ID: ${TEST_CONFIG.realUserId}`);
    console.log('='.repeat(60));
    
    const testCases = [
      { text: 'ตรวจสอบสถานะ', type: 'message', desc: 'พิมพ์ตรวจสอบสถานะ' },
      { text: 'สถานะ', type: 'message', desc: 'พิมพ์สถานะ' },
      { text: 'action=check_status', type: 'postback', desc: 'กดปุ่มตรวจสอบสถานะ' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📋 ทดสอบ: ${testCase.desc}`);
      console.log('-'.repeat(40));
      
      const event = createLineEvent(testCase.text, testCase.type);
      const webhookBody = { events: [event] };
      
      const bodyString = JSON.stringify(webhookBody);
      const signature = createSignature(bodyString, TEST_CONFIG.channelSecret);
      
      console.log(`📤 ส่ง ${testCase.type}: "${testCase.text}"`);
      
      const startTime = Date.now();
      const response = await axios.post(TEST_CONFIG.webhookUrl, webhookBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Line-Signature': signature,
          'User-Agent': 'LineBotSdk/1.0'
        },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Response: ${response.status} (${responseTime}ms)`);
      console.log(`📄 Data:`, response.data);
      
      // รอสักครู่ระหว่างการทดสอบ
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, error.response.data);
    }
  }
}

// ฟังก์ชันสร้างข้อมูล test borrower
async function createTestBorrower() {
  try {
    console.log('🏗️ สร้างข้อมูล test borrower...');
    
    const testData = {
      lineUserId: TEST_CONFIG.realUserId,
      fullName: 'ทดสอบ ระบบ',
      phoneNumber: '0812345678',
      nationalId: '1234567890123',
      email: 'test@example.com',
      requestedAmount: 50000,
      purpose: 'ทดสอบระบบ',
      status: 'approved',
      referenceNumber: 'TK' + Date.now(),
      timestamp: new Date(),
      createdAt: new Date(),
      steps: [
        {
          step: 1,
          title: 'ยื่นใบสมัคร',
          status: 'completed',
          timestamp: new Date(Date.now() - 86400000) // 1 วันที่แล้ว
        },
        {
          step: 2,
          title: 'ตรวจสอบเอกสาร',
          status: 'completed',
          timestamp: new Date(Date.now() - 43200000) // 12 ชม.ที่แล้ว
        },
        {
          step: 3,
          title: 'อนุมัติสินเชื่อ',
          status: 'completed',
          timestamp: new Date()
        }
      ]
    };
    
    // ใช้ admin API เพื่อสร้างข้อมูล
    const adminUrl = 'https://us-central1-baan-tk.cloudfunctions.net/adminApi/test-borrower';
    
    const response = await axios.post(adminUrl, testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer BaanTK@Adm1n' // admin token
      }
    });
    
    console.log('✅ สร้างข้อมูล test borrower สำเร็จ');
    console.log('📄 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error creating test borrower:', error.message);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, error.response.data);
    }
  }
}

// ฟังก์ชันหลัก
async function main() {
  try {
    console.log('🔧 Real User Status Check Test');
    console.log(`⏰ ${new Date().toLocaleString('th-TH')}`);
    console.log('='.repeat(70));
    
    const args = process.argv.slice(2);
    const command = args[0] || 'test';
    
    if (command === 'create') {
      await createTestBorrower();
    } else if (command === 'test') {
      await testStatusCheck();
    } else if (command === 'all') {
      console.log('1️⃣ สร้างข้อมูล test borrower...\n');
      await createTestBorrower();
      
      console.log('\n2️⃣ ทดสอบการตรวจสอบสถานะ...\n');
      await new Promise(resolve => setTimeout(resolve, 3000)); // รอ 3 วินาที
      await testStatusCheck();
    } else {
      console.log('📖 วิธีใช้งาน:');
      console.log('  node test-real-user-status.js [command]');
      console.log('');
      console.log('🔧 Commands:');
      console.log('  test     - ทดสอบการตรวจสอบสถานะ (default)');
      console.log('  create   - สร้างข้อมูล test borrower');
      console.log('  all      - สร้างข้อมูลและทดสอบ');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// เรียกใช้งาน
if (require.main === module) {
  main();
}

module.exports = {
  testStatusCheck,
  createTestBorrower
};
