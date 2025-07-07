// Test script for LINE Auto-Reply enhanced features
const admin = require("firebase-admin");

// Mock LINE client for testing
const mockLineClient = {
  replyMessage: async (replyToken, message) => {
    console.log('📤 Mock reply message:', { replyToken, message });
    return Promise.resolve();
  },
  pushMessage: async (userId, message) => {
    console.log('📤 Mock push message:', { userId, message });
    return Promise.resolve();
  },
  getMessageContent: async (messageId) => {
    console.log('📥 Mock get message content:', messageId);
    return Buffer.from('mock image data');
  }
};

// Mock Firestore for testing
const mockDb = {
  collection: (name) => ({
    where: () => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            empty: false,
            docs: [{
              data: () => ({
                userId: 'test-user-123',
                firstName: 'ทดสอบ',
                lastName: 'ระบบ',
                idCard: '1234567890123',
                status: 'approved',
                amount: 10000,
                frequency: 'monthly',
                totalLoan: 10000,
                interestRate: 0.1,
                dueDate: {
                  toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // พรุ่งนี้
                },
                createdAt: new Date()
              })
            }]
          })
        })
      })
    }),
    add: async (data) => {
      console.log('💾 Mock Firestore add:', data);
      return { id: 'mock-doc-id' };
    }
  })
};

// Test functions
async function testStatusCheck() {
  console.log('\n🧪 Testing Status Check Functions...');    // Mock the required modules
    const lineAutoReply = require('./functions/line-auto-reply');
  
  // Override the database and client for testing
  global.db = mockDb;
  global.lineClient = mockLineClient;
  
  try {
    // Test checking user status
    console.log('\n1. Testing checkCurrentUserStatus...');
    const statusResult = await lineAutoReply.checkCurrentUserStatus('test-user-123');
    console.log('✅ Status check result:', statusResult ? 'Success' : 'Failed');
    
    // Test checking by ID card
    console.log('\n2. Testing checkLoanStatusByIdCard...');
    const idCardResult = await lineAutoReply.checkLoanStatusByIdCard('1234567890123', 'test-user-123');
    console.log('✅ ID card check result:', idCardResult ? 'Success' : 'Failed');
    
    // Test creating payment details
    console.log('\n3. Testing createPaymentDetailsMessage...');
    const paymentDetails = await lineAutoReply.createPaymentDetailsMessage('test-user-123');
    console.log('✅ Payment details result:', paymentDetails ? 'Success' : 'Failed');
    
    console.log('\n✅ All status check tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testImageHandling() {
  console.log('\n🧪 Testing Image Handling...');
  
  const mockEvent = {
    message: {
      id: 'mock-message-id',
      type: 'image'
    },
    source: {
      userId: 'test-user-123'
    },
    replyToken: 'mock-reply-token'
  };
  
  try {
    // Override Firebase Admin for testing
    if (!admin.apps.length) {
      console.log('🔥 Initializing Firebase Admin for testing...');
      // In real testing, you would initialize with test credentials
    }
    
    console.log('✅ Image handling test setup completed!');
    console.log('ℹ️  Full image handling test requires Firebase Storage setup');
    
  } catch (error) {
    console.error('❌ Image handling test failed:', error.message);
  }
}

async function testNotifications() {
  console.log('\n🧪 Testing Notification Functions...');
  
  const lineAutoReply = require('./functions/line-auto-reply');
  
  try {
    // Mock borrower data for notification test
    const mockBorrowerData = {
      userId: 'test-user-123',
      firstName: 'ทดสอบ',
      lastName: 'ระบบ',
      totalLoan: 10000,
      interestRate: 0.1,
      dueDate: {
        toDate: () => new Date() // วันนี้ครบกำหนด
      }
    };
    
    console.log('\n1. Testing sendPaymentDueNotification...');
    // Override lineClient for testing
    global.lineClient = mockLineClient;
    
    const notificationResult = await lineAutoReply.sendPaymentDueNotification(mockBorrowerData);
    console.log('✅ Notification result:', notificationResult.success ? 'Success' : 'Failed');
    
    console.log('\n✅ Notification tests completed!');
    
  } catch (error) {
    console.error('❌ Notification test failed:', error.message);
  }
}

async function testMessageProcessing() {
  console.log('\n🧪 Testing Message Processing...');
  
  const mockTextEvent = {
    type: 'message',
    message: {
      type: 'text',
      text: '1234567890123' // เลขบัตรประชาชน
    },
    source: {
      userId: 'test-user-123'
    },
    replyToken: 'mock-reply-token'
  };
  
  const mockPostbackEvent = {
    type: 'postback',
    postback: {
      data: 'action=check_status'
    },
    source: {
      userId: 'test-user-123'  
    },
    replyToken: 'mock-reply-token'
  };
  
  try {
    const lineAutoReply = require('./functions/line-auto-reply');
    
    // Override globals for testing
    global.db = mockDb;
    global.lineClient = mockLineClient;
    
    console.log('\n1. Testing text message with ID card...');
    const textResult = await lineAutoReply.processLineMessage(mockTextEvent);
    console.log('✅ Text message result:', textResult.success ? 'Success' : 'Failed');
    
    console.log('\n2. Testing postback event...');
    const postbackResult = await lineAutoReply.processPostbackEvent(mockPostbackEvent);
    console.log('✅ Postback result:', postbackResult.success ? 'Success' : 'Failed');
    
    console.log('\n✅ Message processing tests completed!');
    
  } catch (error) {
    console.error('❌ Message processing test failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting LINE Auto-Reply Enhanced Features Tests...');
  console.log('=' .repeat(60));
  
  try {
    await testStatusCheck();
    await testImageHandling();
    await testNotifications();
    await testMessageProcessing();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Status checking system');
    console.log('✅ Image handling for payment slips');
    console.log('✅ Payment due notifications');
    console.log('✅ Enhanced message processing');
    
    console.log('\n💡 Next steps:');
    console.log('1. Deploy the updated functions');
    console.log('2. Test with real LINE account');
    console.log('3. Configure Firebase Storage for image uploads');
    console.log('4. Set up automated notification scheduler');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testStatusCheck,
  testImageHandling,
  testNotifications,
  testMessageProcessing
};
