// ทดสอบการส่งข้อความและตรวจสอบการตอบกลับ
const axios = require('axios');

const WEBHOOK_URL = 'https://webhook-kkrrpg5icq-uc.a.run.app';

// สร้าง test events แบบต่างๆ
function createTestEvents() {
  return {
    // ข้อความธรรมดา
    textMessage: {
      events: [
        {
          type: 'message',
          message: {
            type: 'text',
            text: 'สวัสดี'
          },
          replyToken: 'test-reply-token-' + Date.now(),
          source: {
            userId: 'test-user-text',
            type: 'user'
          },
          timestamp: Date.now()
        }
      ]
    },

    // การกดปุ่ม
    postbackEvent: {
      events: [
        {
          type: 'postback',
          postback: {
            data: 'action=menu'
          },
          replyToken: 'test-postback-token-' + Date.now(),
          source: {
            userId: 'test-user-postback',
            type: 'user'
          },
          timestamp: Date.now()
        }
      ]
    },

    // Follow event
    followEvent: {
      events: [
        {
          type: 'follow',
          replyToken: 'test-follow-token-' + Date.now(),
          source: {
            userId: 'test-user-follow',
            type: 'user'
          },
          timestamp: Date.now()
        }
      ]
    },

    // ข้อความตรวจสอบสถานะ
    statusMessage: {
      events: [
        {
          type: 'message',
          message: {
            type: 'text',
            text: 'ตรวจสอบสถานะ'
          },
          replyToken: 'test-status-token-' + Date.now(),
          source: {
            userId: 'test-user-status',
            type: 'user'
          },
          timestamp: Date.now()
        }
      ]
    }
  };
}

// ทดสอบการเชื่อมต่อ webhook
async function testWebhookConnection() {
  console.log('🔍 ทดสอบการเชื่อมต่อ webhook...');
  
  try {
    const response = await axios.get(WEBHOOK_URL, {
      timeout: 10000
    });
    
    console.log('✅ Webhook accessible');
    console.log('📋 Status:', response.status);
    console.log('📄 Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Webhook connection failed:', error.message);
    if (error.response) {
      console.error('📋 Error Status:', error.response.status);
      console.error('📄 Error Data:', error.response.data);
    }
    return false;
  }
}

// ทดสอบการส่งข้อความแต่ละแบบ
async function testMessageResponse(eventName, eventData) {
  console.log(`\n📤 ทดสอบ: ${eventName}`);
  console.log('=' * 40);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(WEBHOOK_URL, eventData, {
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': 'test-signature-' + Date.now()
      },
      timeout: 15000
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Response received');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('📋 Status:', response.status);
    console.log('📄 Response Data:', JSON.stringify(response.data, null, 2));
    
    // ตรวจสอบประเภทของ response
    if (response.data) {
      if (response.data.message === 'Success') {
        console.log('🎯 ✅ Webhook processed successfully');
      } else if (response.data.error) {
        console.log('⚠️  Warning: Response contains error');
      }
    }
    
    return { success: true, duration, data: response.data };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📋 Error Status:', error.response.status);
      console.error('📄 Error Data:', error.response.data);
      
      // ตรวจสอบประเภทข้อผิดพลาด
      if (error.response.status === 403) {
        console.error('🔒 Permission denied - ตรวจสอบ LINE signature');
      } else if (error.response.status === 500) {
        console.error('💥 Server error - ตรวจสอบ function logs');
      }
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 DNS/Network error - ตรวจสอบ URL');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ Timeout - function อาจใช้เวลานาน');
    }
    
    return { success: false, error: error.message };
  }
}

// ทดสอบ LINE signature validation
async function testSignatureValidation() {
  console.log('\n🔐 ทดสอบ LINE Signature Validation');
  console.log('-' * 40);
  
  const testEvent = {
    events: [
      {
        type: 'message',
        message: { type: 'text', text: 'test signature' },
        replyToken: 'test-sig-token',
        source: { userId: 'test-sig-user', type: 'user' }
      }
    ]
  };
  
  // ทดสอบแบบไม่มี signature
  console.log('📤 Test 1: No signature header');
  try {
    await axios.post(WEBHOOK_URL, testEvent, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log('✅ Accepted without signature');
  } catch (error) {
    console.log(`❌ Rejected: ${error.response?.status} ${error.message}`);
  }
  
  // ทดสอบแบบ signature ผิด
  console.log('\n📤 Test 2: Invalid signature');
  try {
    await axios.post(WEBHOOK_URL, testEvent, {
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': 'invalid-signature'
      },
      timeout: 10000
    });
    console.log('✅ Accepted with invalid signature');
  } catch (error) {
    console.log(`❌ Rejected: ${error.response?.status} ${error.message}`);
  }
}

// รวบรวมผลการทดสอบ
async function runAllTests() {
  console.log('🧪 เริ่มทดสอบระบบ LINE Bot Auto-Reply');
  console.log('📅 วันที่:', new Date().toLocaleString('th-TH'));
  console.log('🔗 Webhook URL:', WEBHOOK_URL);
  console.log('=' * 60);
  
  const results = [];
  
  // 1. ทดสอบการเชื่อมต่อ
  const connectionOk = await testWebhookConnection();
  if (!connectionOk) {
    console.log('\n❌ ไม่สามารถเชื่อมต่อ webhook ได้ หยุดการทดสอบ');
    return;
  }
  
  // 2. ทดสอบ signature validation
  await testSignatureValidation();
  
  // 3. ทดสอบข้อความแต่ละแบบ
  const testEvents = createTestEvents();
  
  for (const [eventName, eventData] of Object.entries(testEvents)) {
    const result = await testMessageResponse(eventName, eventData);
    results.push({ eventName, ...result });
    
    // รอสักครู่เพื่อไม่ให้ spam
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 4. สรุปผลการทดสอบ
  console.log('\n📊 สรุปผลการทดสอบ');
  console.log('=' * 50);
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ สำเร็จ: ${successful}/${total} tests`);
  console.log(`❌ ล้มเหลว: ${total - successful}/${total} tests`);
  
  if (successful === total) {
    console.log('\n🎉 ผ่านการทดสอบทั้งหมด!');
    console.log('💡 หากยังไม่ได้รับข้อความตอบกลับ ตรวจสอบ:');
    console.log('  - LINE Channel Settings');
    console.log('  - Webhook URL ใน LINE Developers Console');
    console.log('  - LINE Bot permissions');
  } else {
    console.log('\n⚠️  มีการทดสอบที่ล้มเหลว');
    console.log('💡 ตรวจสอบ Firebase Functions logs:');
    console.log('  firebase functions:log --limit 50');
  }
  
  // แสดงรายละเอียดแต่ละ test
  console.log('\n📋 รายละเอียดการทดสอบ:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`  ${status} ${result.eventName} ${duration}`);
    if (!result.success) {
      console.log(`    Error: ${result.error}`);
    }
  });
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWebhookConnection,
  testMessageResponse,
  testSignatureValidation,
  createTestEvents
};
