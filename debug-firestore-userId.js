// 🔍 Simple test to check Firestore data and userId mapping
const admin = require("firebase-admin");

// Initialize Firebase Admin without service account (ใช้ default credentials)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function debugFirestoreData() {
  console.log("🔍 Starting Firestore data debug...");

  try {
    // ดึงข้อมูลทั้งหมดจาก borrowers collection
    const borrowersSnapshot = await db.collection('borrowers').get();
    
    console.log(`📊 Total borrowers found: ${borrowersSnapshot.size}`);
    
    if (borrowersSnapshot.empty) {
      console.log("❗ No borrowers found in database");
      return;
    }

    // วิเคราะห์ข้อมูลแต่ละ document
    const analysis = {
      withLineUserId: 0,
      withUserId: 0,
      withoutLineUserId: 0,
      withoutUserId: 0,
      samples: []
    };

    borrowersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      
      // นับข้อมูลที่มี/ไม่มี userId fields
      if (data.lineUserId) analysis.withLineUserId++;
      else analysis.withoutLineUserId++;
      
      if (data.userId) analysis.withUserId++;
      else analysis.withoutUserId++;
      
      // เก็บ sample ข้อมูล 5 รายการแรก
      if (index < 5) {
        analysis.samples.push({
          id: doc.id,
          userId: data.userId || 'N/A',
          lineUserId: data.lineUserId || 'N/A',
          firstName: data.firstName || 'N/A',
          lastName: data.lastName || 'N/A',
          status: data.status || 'N/A',
          timestamp: data.timestamp?.toDate?.() || data.createdAt?.toDate?.() || 'N/A'
        });
      }
    });

    console.log("📈 Analysis Results:");
    console.log(`- Documents with lineUserId: ${analysis.withLineUserId}`);
    console.log(`- Documents with userId: ${analysis.withUserId}`);
    console.log(`- Documents without lineUserId: ${analysis.withoutLineUserId}`);
    console.log(`- Documents without userId: ${analysis.withoutUserId}`);

    console.log("\n📋 Sample Data:");
    analysis.samples.forEach((sample, index) => {
      console.log(`${index + 1}. ID: ${sample.id}`);
      console.log(`   - userId: ${sample.userId}`);
      console.log(`   - lineUserId: ${sample.lineUserId}`);
      console.log(`   - Name: ${sample.firstName} ${sample.lastName}`);
      console.log(`   - Status: ${sample.status}`);
      console.log(`   - Date: ${sample.timestamp}`);
      console.log("");
    });

    // ทดสอบการค้นหาด้วย lineUserId ตัวอย่าง
    if (analysis.samples.length > 0) {
      const testUserId = analysis.samples[0].lineUserId;
      if (testUserId && testUserId !== 'N/A') {
        console.log(`🔍 Testing search with lineUserId: ${testUserId}`);
        
        const searchResult = await db.collection('borrowers')
          .where('lineUserId', '==', testUserId)
          .get();
          
        console.log(`📊 Search result: ${searchResult.size} documents found`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
  
  console.log("✅ Debug completed");
  process.exit(0);
}

// รันการดีบัก
debugFirestoreData();
