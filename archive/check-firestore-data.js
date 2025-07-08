// 📊 Simple Firestore Data Check
// รันไฟล์นี้เพื่อตรวจสอบข้อมูลใน Firestore

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function loadEnvFile() {
  const envPath = path.join(__dirname, 'functions', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  });
  
  return envVars;
}

const env = loadEnvFile();

const serviceAccount = {
  "type": "service_account",
  "project_id": env.GOOGLE_PROJECT_ID,
  "client_email": env.GOOGLE_CLIENT_EMAIL,
  "private_key": env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: env.FIRESTORE_DATABASE_URL,
  storageBucket: env.STORAGE_BUCKET
});

const db = admin.firestore();

async function checkData() {
  console.log('🔍 Checking Firestore data...');
  
  try {
    // Check borrowers
    const borrowersSnapshot = await db.collection('borrowers').get();
    console.log(`👥 Borrowers: ${borrowersSnapshot.size} documents`);
    
    if (borrowersSnapshot.size > 0) {
      borrowersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  📄 ${doc.id}: ${data.name} - ${data.status} - ₹${data.loanAmount}`);
      });
    }
    
    // Check payment slips
    const slipsSnapshot = await db.collection('paymentSlips').get();
    console.log(`\n💳 Payment Slips: ${slipsSnapshot.size} documents`);
    
    if (slipsSnapshot.size > 0) {
      slipsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  📄 ${doc.id}: ${data.borrowerName} - ₹${data.amount} - ${data.status}`);
      });
    }
    
    // Check uploaded images
    const imagesSnapshot = await db.collection('uploadedImages').get();
    console.log(`\n📄 Uploaded Images: ${imagesSnapshot.size} documents`);
    
    if (imagesSnapshot.size > 0) {
      imagesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  📄 ${doc.id}: ${data.originalName} - ${data.contentType}`);
      });
    }
    
    console.log('\n📊 Summary:');
    console.log(`- Borrowers: ${borrowersSnapshot.size}`);
    console.log(`- Payment Slips: ${slipsSnapshot.size}`);
    console.log(`- Documents: ${imagesSnapshot.size}`);
    console.log(`- Total: ${borrowersSnapshot.size + slipsSnapshot.size + imagesSnapshot.size}`);
    
    if (borrowersSnapshot.size === 0 && slipsSnapshot.size === 0 && imagesSnapshot.size === 0) {
      console.log('\n⚠️ No data found! Creating sample data...');
      // สร้างข้อมูลตัวอย่าง
      await createSampleData();
    } else {
      console.log('\n✅ Data exists in Firestore!');
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

async function createSampleData() {
  console.log('📝 Creating sample data...');
  
  try {
    // สร้าง borrower ตัวอย่าง
    await db.collection('borrowers').add({
      name: 'นาย ทดสอบ ระบบ',
      phone: '0800000000',
      idCard: '0000000000000',
      loanAmount: 10000,
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      lineUserId: 'U_test_user_id'
    });
    
    // สร้าง payment slip ตัวอย่าง
    await db.collection('paymentSlips').add({
      borrowerId: 'test-id',
      borrowerName: 'นาย ทดสอบ ระบบ',
      amount: 2000,
      imageUrl: 'https://via.placeholder.com/400x600/4CAF50/FFFFFF?text=Test+Slip',
      status: 'pending',
      uploadedAt: admin.firestore.Timestamp.now(),
      note: 'สลิปทดสอบระบบ'
    });
    
    // สร้าง document ตัวอย่าง
    await db.collection('uploadedImages').add({
      fileName: 'test-document.jpg',
      originalName: 'เอกสารทดสอบ.jpg',
      contentType: 'image/jpeg',
      size: 100000,
      downloadURL: 'https://via.placeholder.com/600x400/2196F3/FFFFFF?text=Test+Document',
      uploadedAt: admin.firestore.Timestamp.now(),
      uploader: 'นาย ทดสอบ ระบบ',
      category: 'test'
    });
    
    console.log('✅ Sample data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

checkData().then(() => {
  console.log('\n🎉 Check completed!');
  console.log('🌐 Admin Dashboard: https://baan-tk.web.app/admin.html');
  console.log('🔑 Token: admin123 or BaanTK@Adm1n');
  process.exit(0);
}).catch(error => {
  console.error('💥 Check failed:', error);
  process.exit(1);
});
