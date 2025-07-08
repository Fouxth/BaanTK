// 🔥 Live Webhook Test - ทดสอบด้วย real reply token pattern
// สคริปต์นี้จำลอง LINE webhook ที่เข้ามาจริง

const axios = require('axios');

const WEBHOOK_URL = 'https://webhook-kkrrpg5icq-uc.a.run.app/webhook';

// สร้าง mock reply token ที่ดูเหมือนของจริง
function generateRealisticReplyToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// สร้าง user ID ที่ดูเหมือนของจริง
function generateRealisticUserId() {
  return 'U' + 'a'.repeat(32).replace(/./g, () => 
    'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  );
}

// สร้าง LINE events ที่ดูเหมือนของจริง
const realisticEvents = [
  {
    name: 'follow-event',
    description: 'ผู้ใช้เพิ่มบอทเป็นเพื่อน',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'follow',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: generateRealisticUserId()
        },
        replyToken: generateRealisticReplyToken()
      }]
    }
  },
  {
    name: 'text-message',
    description: 'ข้อความ "สวัสดี" จากผู้ใช้จริง',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: generateRealisticUserId()
        },
        message: {
          id: Date.now().toString(),
          type: 'text',
          text: 'สวัสดี'
        },
        replyToken: generateRealisticReplyToken()
      }]
    }
  },
  {
    name: 'menu-request',
    description: 'ข้อความ "เมนู" จากผู้ใช้จริง',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: generateRealisticUserId()
        },
        message: {
          id: Date.now().toString(),
          type: 'text',
          text: 'เมนู'
        },
        replyToken: generateRealisticReplyToken()
      }]
    }
  },
  {
    name: 'postback-register',
    description: 'กดปุ่มสมัครใน Flex Message',
    data: {
      destination: 'U' + 'b'.repeat(32),
      events: [{
        type: 'postback',
        mode: 'active',
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: generateRealisticUserId()
        },
        postback: {
          data: 'action=register'
        },
        replyToken: generateRealisticReplyToken()
      }]
    }
  }
];

async function testRealisticWebhook(event) {
  try {
    console.log(`\n🔥 Testing ${event.name}...`);
    console.log(`📝 ${event.description}`);
    console.log(`🆔 User ID: ${event.data.events[0].source.userId}`);
    console.log(`🎟️ Reply Token: ${event.data.events[0].replyToken}`);

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

async function runRealisticTests() {
  console.log('🔥 Running Realistic LINE Webhook Tests');
  console.log('=======================================');
  console.log('📍 Target URL:', WEBHOOK_URL);
  console.log('⏰ Started:', new Date().toISOString());
  console.log('🎯 Simulating real LINE webhook events with realistic tokens');
  console.log('');

  const results = [];

  for (const event of realisticEvents) {
    const result = await testRealisticWebhook(event);
    results.push({
      name: event.name,
      description: event.description,
      ...result
    });

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n📊 Realistic Test Summary:');
  console.log('==========================');
  
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
    if (!result.success) {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
  });

  console.log('⏰ Completed:', new Date().toISOString());
  
  if (successful === total) {
    console.log('\n🎉 All realistic webhook tests passed!');
    console.log('💡 System should be ready for real LINE webhook integration');
    console.log('📋 Next steps:');
    console.log('   1. Set webhook URL in LINE Developers Console');
    console.log('   2. Test with real LINE app messages');
    console.log('   3. Monitor Firebase Console logs for real traffic');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the logs and configuration.');
  }

  return results;
}

// Run if executed directly
if (require.main === module) {
  runRealisticTests()
    .then(results => {
      const allPassed = results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runRealisticTests, realisticEvents };
