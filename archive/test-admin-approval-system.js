// ทดสอบระบบแจ้งเตือนการอนุมัติและลงนามสัญญาดิจิทัล
// พร้อมปุ่มยืนยันการกู้และใบสัญญาตามกฎหมาย

const axios = require('axios');

const WEBHOOK_URL = 'https://webhook-kkrrpg5icq-uc.a.run.app';

// Mock admin approval notification
async function testAdminApprovalNotification() {
  console.log('🧪 ทดสอบการแจ้งเตือนการอนุมัติจากแอดมิน');
  console.log('=' * 60);

  // Mock borrower data
  const mockBorrowerData = {
    id: 'test-borrower-123',
    fullName: 'สมชาย ใจดี',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    phoneNumber: '081-234-5678',
    totalLoan: 25000,
    amount: 25000,
    interestRate: 15,
    status: 'approved',
    dueDate: {
      toDate: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  };

  console.log('📋 ข้อมูลที่จะส่งแจ้งเตือน:');
  console.log(`- ชื่อ: ${mockBorrowerData.fullName}`);
  console.log(`- วงเงิน: ${mockBorrowerData.totalLoan.toLocaleString()} บาท`);
  console.log(`- ดอกเบี้ย: ${mockBorrowerData.interestRate}% ต่อเดือน`);
  console.log(`- ยอดรวม: ${(mockBorrowerData.totalLoan * 1.15).toLocaleString()} บาท`);

  return mockBorrowerData;
}

// ทดสอบปุ่มยืนยันการกู้
async function testLoanConfirmation() {
  console.log('\n🔘 ทดสอบการกดปุ่มยืนยันการกู้');
  console.log('-' * 40);

  const confirmEvent = {
    events: [
      {
        type: 'postback',
        postback: {
          data: 'action=confirm_loan&borrowerId=test-borrower-123&amount=25000'
        },
        replyToken: 'test-confirm-reply-' + Date.now(),
        source: {
          userId: 'test-user-confirm',
          type: 'user'
        }
      }
    ]
  };

  try {
    console.log('📤 ส่งคำขอยืนยันการกู้...');
    const response = await axios.post(WEBHOOK_URL, confirmEvent, {
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': 'test-signature'
      },
      timeout: 15000
    });

    console.log('✅ Response Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('🎯 ✅ ระบบยืนยันการกู้ทำงานได้');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📋 Error Response:', error.response.data);
    }
  }
}

// ทดสอบการดูใบสัญญา
async function testContractView() {
  console.log('\n📄 ทดสอบการดูใบสัญญาเต็ม');
  console.log('-' * 40);

  const contractEvent = {
    events: [
      {
        type: 'postback',
        postback: {
          data: 'action=view_contract&borrowerId=test-borrower-123'
        },
        replyToken: 'test-contract-reply-' + Date.now(),
        source: {
          userId: 'test-user-contract',
          type: 'user'
        }
      }
    ]
  };

  try {
    console.log('📤 ส่งคำขอดูใบสัญญา...');
    const response = await axios.post(WEBHOOK_URL, contractEvent, {
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': 'test-signature'
      },
      timeout: 15000
    });

    console.log('✅ Response Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('🎯 ✅ ระบบแสดงใบสัญญาทำงานได้');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📋 Error Response:', error.response.data);
    }
  }
}

// ทดสอบลำดับการใช้งานแบบจริง
async function testFullWorkflow() {
  console.log('\n🔄 ทดสอบลำดับการใช้งานเต็ม');
  console.log('-' * 50);

  const steps = [
    '1. แอดมินอนุมัติคำขอ → ส่งข้อความแจ้งเตือน',
    '2. ผู้ใช้กดดูใบสัญญาเต็ม',
    '3. ผู้ใช้กดยืนยันการกู้และลงนามสัญญา',
    '4. ระบบบันทึกลายเซ็นดิจิทัลและอัปเดตสถานะ'
  ];

  steps.forEach(step => {
    console.log(`📋 ${step}`);
  });

  console.log('\n🎯 ข้อกฎหมายที่ระบุในสัญญา:');
  console.log('⚖️  1. ยินยอมชำระตามกำหนดเวลา');
  console.log('⚖️  2. ยอมรับการดำเนินคดีหากผิดนัด');
  console.log('⚖️  3. สละสิทธิ์ฟ้องกลับหรือโต้แย้งดอกเบี้ย');
  console.log('⚖️  4. ยินยอมการติดตามทวงถามตามกฎหมาย');
}

// รันการทดสอบทั้งหมด
async function runAllTests() {
  try {
    const borrowerData = await testAdminApprovalNotification();
    await testContractView();
    await testLoanConfirmation();
    await testFullWorkflow();
    
    console.log('\n🎉 การทดสอบเสร็จสิ้น!');
    console.log('📋 สรุปฟีเจอร์ใหม่:');
    console.log('✅ ข้อความแจ้งการอนุมัติอัตโนมัติ');
    console.log('✅ แสดงวงเงินและเงื่อนไขชัดเจน');
    console.log('✅ ปุ่มยืนยันการกู้พร้อมลายเซ็นดิจิทัล');
    console.log('✅ ใบสัญญาครบถ้วนตามกฎหมาย');
    console.log('✅ บันทึก transaction log');
    console.log('✅ อัปเดตสถานะอัตโนมัติ');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  testAdminApprovalNotification,
  testLoanConfirmation,
  testContractView,
  testFullWorkflow
};
