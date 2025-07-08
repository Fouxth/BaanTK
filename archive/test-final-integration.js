// 🎯 Final Integration Test - ทดสอบการทำงานครบถ้วน
const axios = require('axios');

const WEBHOOK_URL = 'https://webhook-kkrrpg5icq-uc.a.run.app/webhook';

// ทดสอบ scenario ต่างๆ ที่ผู้ใช้จริงอาจทำ
const realUserScenarios = [
  {
    name: 'new-user-follow',
    description: 'ผู้ใช้ใหม่เพิ่มบอทเป็นเพื่อน',
    event: {
      events: [{
        type: 'follow',
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567890'
      }]
    }
  },
  {
    name: 'greeting-message',
    description: 'ผู้ใช้ส่งข้อความทักทาย',
    event: {
      events: [{
        type: 'message',
        message: { type: 'text', text: 'สวัสดีครับ' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567891'
      }]
    }
  },
  {
    name: 'request-menu',
    description: 'ผู้ใช้ขอดูเมนู',
    event: {
      events: [{
        type: 'message',
        message: { type: 'text', text: 'ดูเมนูหน่อย' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567892'
      }]
    }
  },
  {
    name: 'register-interest',
    description: 'ผู้ใช้สนใจสมัครสินเชื่อ',
    event: {
      events: [{
        type: 'postback',
        postback: { data: 'action=register' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567893'
      }]
    }
  },
  {
    name: 'check-status',
    description: 'ผู้ใช้ตรวจสอบสถานะ',
    event: {
      events: [{
        type: 'postback',
        postback: { data: 'action=check_status' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567894'
      }]
    }
  },
  {
    name: 'payment-slip',
    description: 'ผู้ใช้ส่งสลิปการชำระ',
    event: {
      events: [{
        type: 'message',
        message: { type: 'text', text: 'ส่งสลิปการชำระ' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567895'
      }]
    }
  },
  {
    name: 'contact-request',
    description: 'ผู้ใช้ขอข้อมูลติดต่อ',
    event: {
      events: [{
        type: 'postback',
        postback: { data: 'action=contact' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567896'
      }]
    }
  },
  {
    name: 'unknown-message',
    description: 'ผู้ใช้ส่งข้อความที่ไม่รู้จัก',
    event: {
      events: [{
        type: 'message',
        message: { type: 'text', text: 'อะไรนะ ไม่เข้าใจเลย' },
        source: { userId: 'U1234567890abcdefghijk' },
        replyToken: 'replyToken1234567897'
      }]
    }
  }
];

async function runFinalTest() {
  console.log('🎯 Running Final Integration Test');
  console.log('==================================');
  console.log('📍 Target:', WEBHOOK_URL);
  console.log('⏰ Started:', new Date().toISOString());
  console.log('');

  const results = [];

  for (const scenario of realUserScenarios) {
    try {
      console.log(`🧪 Testing: ${scenario.name}`);
      console.log(`📝 Description: ${scenario.description}`);
      
      const startTime = Date.now();
      
      const response = await axios.post(WEBHOOK_URL, scenario.event, {
        headers: {
          'Content-Type': 'application/json',
          'X-Line-Signature': 'mock-signature'
        },
        timeout: 10000
      });

      const duration = Date.now() - startTime;
      
      console.log(`✅ Success (${duration}ms):`, {
        status: response.status,
        data: response.data
      });

      results.push({
        scenario: scenario.name,
        description: scenario.description,
        success: true,
        duration,
        status: response.status,
        data: response.data
      });

    } catch (error) {
      console.log(`❌ Failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      results.push({
        scenario: scenario.name,
        description: scenario.description,
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }

    console.log('');
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final summary
  console.log('📊 Final Test Summary');
  console.log('====================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const avgDuration = results
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / 
    results.filter(r => r.success && r.duration).length;

  console.log(`✅ Successful: ${successful}/${total} (${(successful/total*100).toFixed(1)}%)`);
  console.log(`⚡ Average Response Time: ${avgDuration?.toFixed(0) || 'N/A'}ms`);
  console.log('');

  // Detailed results
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${status} ${result.scenario}${duration}`);
    if (!result.success) {
      console.log(`   ❌ Error: ${result.error}`);
    }
  });

  console.log('');
  console.log('⏰ Completed:', new Date().toISOString());

  // Export results for analysis
  return {
    summary: {
      successful,
      total,
      successRate: successful/total*100,
      averageResponseTime: avgDuration || 0
    },
    results
  };
}

// Run the test
if (require.main === module) {
  runFinalTest()
    .then(results => {
      console.log('\n🎉 Final integration test completed!');
      
      if (results.summary.successRate === 100) {
        console.log('🌟 ALL TESTS PASSED! Auto-reply system is fully functional.');
        process.exit(0);
      } else {
        console.log(`⚠️  Some tests failed. Success rate: ${results.summary.successRate.toFixed(1)}%`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runFinalTest, realUserScenarios };
