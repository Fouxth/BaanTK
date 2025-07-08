// 🏗️ Script สำหรับสร้างข้อมูล test borrower โดยตรง
const admin = require('firebase-admin');

// Initialize Firebase Admin (ใช้ service account key จาก environment)
const serviceAccount = {
  "type": "service_account",
  "project_id": "baan-tk",
  "private_key_id": "fbsvcecde45a1e5ad20c7ca6ade8e8bb46b63ce",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCUtXyPa/ZSL6JE\n3twvVwpxxgJ+OjwO4O4m0O3FVQqAOH7HJyEzuNqWgyYe7PBktdrBbq528sYb1ly4\nphmRxW+6VOuXlGVvw4YbIQwxPLuqXGyh+Uziln/5eJozty5AGQ2JyqamieFf6oTx\nLoNMOJU+20JSVcluQu2BXvF7PQ7YM+GH4WiiIaJu+JA4M3QjPRaUs6ljaBPBKFQn\no1b8av/fsubMg8Hac/8SamCgjeR+/IZx/doSPcVUzEE8bXLAGErYDqgKy29tOC9W\ndC3hafwqaJcVMXkpN5unhP+MCaYRSBL9Wko9gD3ErqmRQq1OlzojGGd+KFUzdip0\nvHnMLnqbAgMBAAECggEAQcDlrLz+E2UAiRdJoJ0J/zigjZPOTn3ij8M9/00U8ZEJ\nbaG9qpMIBBlFV9NIkB9g9Lqt5eZ+9nwYT4USNURpnKhD66gwGfUIbSJ1s6e5CyEG\n36/N8Tq+p15OQKO0jZ8GP3EdsvGwd6rI0aPRZnh2dW6ZqrJH+LsbLWL/v5BF6g6J\n/vv5HbiARxL3KtLFcSiEW8EjKJEqGgtFn3yXz7pn1HZjHRDkaisRelOSsoMsD2qJ\nfEKC8YFxsbitph+zXiZGAefJD5YZBimGziAzolxBEE6jmRGTyqSWak3qCXtujvnb\naDGBZIvEzXmBWuALNaz3DimQ/CkMyAooYZ8Fv6MvMQKBgQDJTLmyI0zqIl2LoXqY\niB7dLuTxTz5KqDu5YCxcr8kSaZnxuCevbTDL1deje1V6s2kvUQubjqgBIzW/o+sN\nkyncgaeScXWIgvPGwtn+u35Hl4/eLFxRp7+5BTFr/fgjE5K5SZ+cQe66L4wrj/og\nF2+38B14nWh9yo7SocyDDIlfzwKBgQC9HlH+LfcaXRRPgWEGZlwsrIWHGqUNpAjT\nAvP0Kl8Jy0aZWV+BF+kBVAcc2vXi0dw7oR04oVXiReLE9Xy13oV6cFwRfNx6aPs8\nAHeXWjh/goqFo0vhKknHVAi6sjkWxHVjA1Fuezs1cO3ZpgfQLoxWMcXz3OW27OEw\n0E9csMJ/dQKBgQCyI+kNoTm21ZStNcj1ZTjTCmXmuvboQLsh0N9RYurxFWz7wbm1\nAE83g9WiQkoiHNWP3wwDrJo2737oSlqAF+Tq0/6ElU2q8iBjnBoo2KnnF1RlDCLi\nzC3ZwaO76vQFrpOgz2ulb5+hOuSzxGVYswTV5XNfQwWulGwSMMd4jcagdwKBgHkO\nko+xHq7qjBjEibYOCcyy9ppgDO1pZhikmEJgaQuc6mk5E3BQPN+TySXIZ4M0sNQe\nstTQOWipMZrARX8pnKmeiODM21kkIEXtSqBAqU+94SvgNq9AYY/Nk/TmJrMTOM0T\nj6m4ClOQIUCkDfZOBZkbLUqHySfKA/A6N8LuhuINAoGAC/utbtJa8pMDb88jqYlW\ntITzUpiNixmBTvpVbocodY71Fse2+Wt+ubQOOKIbnsB3/t5mIu7UJXZeDD0Bwykt\nOre444lnXpYvIW264AqSZi3gzAo7N4vx93agYLxI6y6bhjHJ9tXWXS454NDisW4z\nqjJJC2q0I9pvBLpMV5IHXpw=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@baan-tk.iam.gserviceaccount.com",
  "client_id": "115977374877950067899",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs?gid=115977374877950067899"
};

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Real User ID จาก logs
const REAL_USER_ID = 'U79c0d4968f31138b09d6e71c3bcc5296';

async function createTestBorrower() {
  try {
    console.log('🏗️ สร้างข้อมูล test borrower สำหรับการทดสอบ...');
    console.log(`👤 User ID: ${REAL_USER_ID}`);
    console.log('='.repeat(60));
    
    const testData = {
      lineUserId: REAL_USER_ID,
      fullName: 'คุณทดสอบ ระบบอัตโนมัติ',
      phoneNumber: '0812345678',
      nationalId: '1234567890123',
      email: 'test.auto@example.com',
      requestedAmount: 75000,
      purpose: 'เงินทุนหมุนเวียนธุรกิจ',
      monthlyIncome: 35000,
      occupation: 'พนักงานบริษัท',
      status: 'approved',
      referenceNumber: 'TK' + Date.now(),
      timestamp: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      approvedAt: admin.firestore.Timestamp.now(),
      interestRate: 2.5,
      loanTerm: 12,
      monthlyPayment: 6500,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))), // 30 วัน
      contractSigned: false,
      digitalSignature: null,
      
      // Process steps
      steps: [
        {
          step: 1,
          title: 'ยื่นใบสมัคร',
          status: 'completed',
          timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - (3 * 24 * 60 * 60 * 1000))), // 3 วันที่แล้ว
          description: 'ผู้สมัครได้ยื่นเอกสารครบถ้วน'
        },
        {
          step: 2,
          title: 'ตรวจสอบเอกสาร',
          status: 'completed',
          timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - (2 * 24 * 60 * 60 * 1000))), // 2 วันที่แล้ว
          description: 'เอกสารถูกต้องครบถ้วน'
        },
        {
          step: 3,
          title: 'ประเมินความเสี่ยง',
          status: 'completed',
          timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - (1 * 24 * 60 * 60 * 1000))), // 1 วันที่แล้ว
          description: 'ผ่านการประเมินความเสี่ยง'
        },
        {
          step: 4,
          title: 'อนุมัติสินเชื่อ',
          status: 'completed',
          timestamp: admin.firestore.Timestamp.now(),
          description: 'อนุมัติวงเงิน 75,000 บาท'
        },
        {
          step: 5,
          title: 'ลงนามสัญญา',
          status: 'pending',
          timestamp: null,
          description: 'รอการลงนามสัญญาดิจิทัล'
        }
      ],
      
      // Loan details
      loanDetails: {
        principal: 75000,
        interestRate: 2.5,
        termMonths: 12,
        monthlyPayment: 6500,
        totalPayment: 78000,
        firstPaymentDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)))
      },
      
      // Documents
      documents: {
        idCard: { status: 'verified', uploadedAt: admin.firestore.Timestamp.now() },
        bankStatement: { status: 'verified', uploadedAt: admin.firestore.Timestamp.now() },
        incomeProof: { status: 'verified', uploadedAt: admin.firestore.Timestamp.now() }
      }
    };
    
    // เพิ่มข้อมูลลงใน Firestore
    const docRef = await db.collection('borrowers').add(testData);
    
    console.log('✅ สร้างข้อมูล test borrower สำเร็จ!');
    console.log(`📄 Document ID: ${docRef.id}`);
    console.log(`📋 Reference Number: ${testData.referenceNumber}`);
    console.log(`💰 Amount: ${testData.requestedAmount.toLocaleString()} บาท`);
    console.log(`📈 Status: ${testData.status}`);
    console.log(`🔢 Steps: ${testData.steps.length} ขั้นตอน`);
    
    return {
      success: true,
      documentId: docRef.id,
      data: testData
    };
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูล:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function listExistingBorrowers() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล borrowers ที่มีอยู่...');
    console.log(`👤 สำหรับ User ID: ${REAL_USER_ID}`);
    console.log('='.repeat(60));
    
    const snapshot = await db.collection('borrowers')
      .where('lineUserId', '==', REAL_USER_ID)
      .orderBy('timestamp', 'desc')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ ไม่พบข้อมูล borrowers สำหรับ User ID นี้');
      return [];
    }
    
    console.log(`✅ พบข้อมูล ${snapshot.size} รายการ:`);
    
    const borrowers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      borrowers.push({
        id: doc.id,
        ...data
      });
      
      console.log(`\n📄 Document ID: ${doc.id}`);
      console.log(`📋 Reference: ${data.referenceNumber}`);
      console.log(`👤 Name: ${data.fullName}`);
      console.log(`💰 Amount: ${data.requestedAmount?.toLocaleString()} บาท`);
      console.log(`📈 Status: ${data.status}`);
      console.log(`🕐 Created: ${data.createdAt?.toDate?.()?.toLocaleString('th-TH') || 'N/A'}`);
    });
    
    return borrowers;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล:', error);
    return [];
  }
}

async function deleteTestBorrowers() {
  try {
    console.log('🗑️ ลบข้อมูล test borrowers...');
    console.log(`👤 สำหรับ User ID: ${REAL_USER_ID}`);
    console.log('='.repeat(60));
    
    const snapshot = await db.collection('borrowers')
      .where('lineUserId', '==', REAL_USER_ID)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ ไม่พบข้อมูลที่จะลบ');
      return;
    }
    
    console.log(`🔍 พบข้อมูล ${snapshot.size} รายการที่จะลบ`);
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      console.log(`📄 จะลบ: ${doc.id} (${doc.data().referenceNumber})`);
    });
    
    await batch.commit();
    console.log('✅ ลบข้อมูลทั้งหมดเรียบร้อย');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลบข้อมูล:', error);
  }
}

// ฟังก์ชันหลัก
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'create';
    
    console.log('🔧 Firebase Test Data Manager');
    console.log(`⏰ ${new Date().toLocaleString('th-TH')}`);
    console.log('='.repeat(70));
    
    switch (command) {
      case 'create':
        await createTestBorrower();
        break;
        
      case 'list':
        await listExistingBorrowers();
        break;
        
      case 'delete':
        await deleteTestBorrowers();
        break;
        
      case 'reset':
        console.log('1️⃣ ลบข้อมูลเก่า...\n');
        await deleteTestBorrowers();
        
        console.log('\n2️⃣ สร้างข้อมูลใหม่...\n');
        await createTestBorrower();
        break;
        
      default:
        console.log('📖 วิธีใช้งาน:');
        console.log('  node create-test-borrower.js [command]');
        console.log('');
        console.log('🔧 Commands:');
        console.log('  create   - สร้างข้อมูล test borrower (default)');
        console.log('  list     - แสดงข้อมูล borrowers ที่มีอยู่');
        console.log('  delete   - ลบข้อมูล test borrowers ทั้งหมด');
        console.log('  reset    - ลบข้อมูลเก่าและสร้างใหม่');
        break;
    }
    
    console.log('\n✅ เสร็จสิ้น');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

// เรียกใช้งาน
if (require.main === module) {
  main();
}

module.exports = {
  createTestBorrower,
  listExistingBorrowers,
  deleteTestBorrowers
};
