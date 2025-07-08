// 🧪 Production Webhook Test Script
// ทดสอบ LINE webhook ใน production environment

const axios = require('axios');

// Production webhook URL (ได้จาก deploy)
const WEBHOOK_URL = 'https://webhook-kkrrpg5icq-uc.a.run.app/webhook';

// Mock LINE events สำหรับทดสอบ
const mockEvents = {
  // Follow event (เมื่อผู้ใช้เพิ่มบอท)
  follow: {
    events: [{
      type: 'follow',
      source: { userId: 'test-user-123' },
      replyToken: 'test-reply-token-follow'
    }]
  },

  // Text message event (ข้อความธรรมดา)
  textMessage: {
    events: [{
      type: 'message',
      message: { type: 'text', text: 'สวัสดี' },
      source: { userId: 'test-user-123' },
      replyToken: 'test-reply-token-text'
    }]
  },

  // Menu request
  menuMessage: {
    events: [{
      type: 'message',
      message: { type: 'text', text: 'เมนู' },
      source: { userId: 'test-user-123' },
      replyToken: 'test-reply-token-menu'
    }]
  },

  // Postback event (จากปุ่ม Flex Message)
  postback: {
    events: [{
      type: 'postback',
      postback: { data: 'action=register' },
      source: { userId: 'test-user-123' },
      replyToken: 'test-reply-token-postback'
    }]
  }
};

// Function to test webhook
async function testWebhook(eventName, eventData) {
  try {
    console.log(`\n🧪 Testing ${eventName}...`);
    console.log('📤 Sending:', JSON.stringify(eventData, null, 2));

    const response = await axios.post(WEBHOOK_URL, eventData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': 'mock-signature' // จำลอง LINE signature
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`✅ ${eventName} Success:`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    return { success: true, status: response.status, data: response.data };

  } catch (error) {
    console.error(`❌ ${eventName} Failed:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status,
      data: error.response?.data 
    };
  }
}

// Function to test basic health check
async function testHealthCheck() {
  try {
    console.log('\n🏥 Testing health check...');
    
    const response = await axios.get(WEBHOOK_URL.replace('/webhook', ''), {
      timeout: 5000
    });

    console.log('✅ Health Check Success:', {
      status: response.status,
      data: response.data
    });

    return { success: true, data: response.data };

  } catch (error) {
    console.error('❌ Health Check Failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    return { success: false, error: error.message };
  }
}

// Main test function
async function runProductionTests() {
  console.log('🚀 Starting Production Webhook Tests');
  console.log('📍 Target URL:', WEBHOOK_URL);
  console.log('⏰ Test started at:', new Date().toISOString());

  const results = {};

  // Test health check first
  results.healthCheck = await testHealthCheck();

  // Test all webhook events
  for (const [eventName, eventData] of Object.entries(mockEvents)) {
    results[eventName] = await testWebhook(eventName, eventData);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  for (const [testName, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${result.success ? 'PASS' : 'FAIL'}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('\n⏰ Test completed at:', new Date().toISOString());
  
  return results;
}

// Export for use in other scripts
module.exports = {
  testWebhook,
  testHealthCheck,
  runProductionTests,
  WEBHOOK_URL,
  mockEvents
};

// Run tests if this script is executed directly
if (require.main === module) {
  runProductionTests()
    .then(results => {
      const allPassed = Object.values(results).every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}
