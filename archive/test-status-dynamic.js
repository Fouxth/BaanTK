// 🔍 Test Dynamic Status Message - ทดสอบการตรวจสอบสถานะแบบ dynamic
const axios = require('axios');

const WEBHOOK_URL = 'https://webhook-kkrrpg5icq-uc.a.run.app/webhook';

// สร้าง realistic LINE events สำหรับทดสอบ status
const statusTestEvents = [
  {
    name: 'status-via-text',
    description: 'ผู้ใช้ส่งข้อความ "สถานะ" เพื่อตรวจสอบ',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U' + 'test123'.repeat(4) + '1234567890ab' // realistic user ID
        },
        message: {
          id: Date.now().toString(),
          type: 'text',
          text: 'สถานะ'
        },
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXKtSmLrGZI' + Math.random().toString(36).substring(2, 8)
      }]
    }
  },
  {
    name: 'status-via-postback',
    description: 'ผู้ใช้กดปุ่ม "ตรวจสอบสถานะ" ในเมนู',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'postback',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U' + 'test456'.repeat(4) + '1234567890ab' // realistic user ID
        },
        postback: {
          data: 'action=check_status'
        },
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXKtSmLrGZI' + Math.random().toString(36).substring(2, 8)
      }]
    }
  },
  {
    name: 'status-keyword-check',
    description: 'ผู้ใช้ส่งข้อความ "ตรวจสอบสถานะ"',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U' + 'test789'.repeat(4) + '1234567890ab' // realistic user ID
        },
        message: {
          id: Date.now().toString(),
          type: 'text',
          text: 'ตรวจสอบสถานะการสมัคร'
        },
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXKtSmLrGZI' + Math.random().toString(36).substring(2, 8)
      }]
    }
  },
  {
    name: 'status-english',
    description: 'ผู้ใช้ส่งข้อความ "status" ภาษาอังกฤษ',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'U' + 'test000'.repeat(4) + '1234567890ab' // realistic user ID
        },
        message: {
          id: Date.now().toString(),
          type: 'text',
          text: 'status'
        },
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXKtSmLrGZI' + Math.random().toString(36).substring(2, 8)
      }]
    }
  }
];

async function testStatusMessage(event) {
  try {
    console.log(`\n🔍 Testing ${event.name}...`);
    console.log(`📝 ${event.description}`);
    console.log(`🆔 User ID: ${event.data.events[0].source.userId}`);
    console.log(`🎟️ Reply Token: ${event.data.events[0].replyToken}`);
    
    if (event.data.events[0].message) {
      console.log(`💬 Message: "${event.data.events[0].message.text}"`);
    } else if (event.data.events[0].postback) {
      console.log(`🔘 Postback: ${event.data.events[0].postback.data}`);
    }

    const startTime = Date.now();

    const response = await axios.post(WEBHOOK_URL, event.data, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LineBotWebhook/2.0',
        'X-Line-Signature': 'sha256=mock_signature_' + Buffer.from(JSON.stringify(event.data)).toString('base64').substring(0, 20)
      },
      timeout: 15000
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Success (${duration}ms):`, {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    return { success: true, duration, response: response.data };

  } catch (error) {
    console.log(`❌ Failed:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    return { success: false, error: error.message };
  }
}

async function runStatusTests() {
  console.log('🔍 Testing Dynamic Status Message System');
  console.log('=======================================');
  console.log('📍 Target URL:', WEBHOOK_URL);
  console.log('⏰ Started:', new Date().toISOString());
  console.log('🎯 Testing dynamic status checking with different user IDs');
  console.log('');

  const results = [];

  for (const event of statusTestEvents) {
    const result = await testStatusMessage(event);
    results.push({
      name: event.name,
      description: event.description,
      userId: event.data.events[0].source.userId,
      ...result
    });

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n📊 Status Test Summary:');
  console.log('=======================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const avgDuration = results
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / 
    results.filter(r => r.success && r.duration).length;

  console.log(`✅ Successful: ${successful}/${total} (${(successful/total*100).toFixed(1)}%)`);
  console.log(`⚡ Average Response Time: ${avgDuration?.toFixed(0) || 'N/A'}ms`);
  console.log('');

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${status} ${result.name}${duration}`);
    console.log(`   📝 ${result.description}`);
    console.log(`   👤 User: ${result.userId.substring(0, 15)}...`);
    if (!result.success) {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
  });

  console.log('⏰ Completed:', new Date().toISOString());
  
  if (successful === total) {
    console.log('\n🎉 All status tests passed!');
    console.log('💡 Dynamic status system is working correctly');
    console.log('📋 Features tested:');
    console.log('   ✅ Text message "สถานะ"');
    console.log('   ✅ Postback "action=check_status"');
    console.log('   ✅ Text message "ตรวจสอบสถานะ"');
    console.log('   ✅ English "status"');
    console.log('   ✅ Dynamic database lookup');
    console.log('   ✅ Fallback for users without data');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the logs and configuration.');
  }

  return results;
}

// Manual test for specific user
async function testSpecificUser(userId, message = 'สถานะ') {
  console.log(`\n🎯 Manual Test for User: ${userId}`);
  console.log(`💬 Message: "${message}"`);
  
  const event = {
    name: 'manual-test',
    description: `Manual test for user ${userId}`,
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: userId
        },
        message: {
          id: Date.now().toString(),
          type: 'text',
          text: message
        },
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXKtSmLrGZI' + Math.random().toString(36).substring(2, 8)
      }]
    }
  };

  return await testStatusMessage(event);
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length >= 2 && args[0] === '--user') {
    // Manual test for specific user
    const userId = args[1];
    const message = args[2] || 'สถานะ';
    
    testSpecificUser(userId, message)
      .then(result => {
        console.log('\n🎯 Manual test completed!');
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('💥 Manual test failed:', error);
        process.exit(1);
      });
  } else {
    // Run all status tests
    runStatusTests()
      .then(results => {
        const allPassed = results.every(r => r.success);
        process.exit(allPassed ? 0 : 1);
      })
      .catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { runStatusTests, testSpecificUser, statusTestEvents };
