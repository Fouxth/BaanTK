// 🔧 Fix existing borrower records without lineUserId
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function fixExistingBorrowerRecords() {
  console.log("🔧 Starting to fix existing borrower records...");

  try {
    // ดึงข้อมูล borrowers ทั้งหมด
    const borrowersSnapshot = await db.collection('borrowers').get();
    
    if (borrowersSnapshot.empty) {
      console.log("❗ No borrowers found in database");
      return;
    }

    console.log(`📊 Total borrowers found: ${borrowersSnapshot.size}`);

    const batch = db.batch();
    let updateCount = 0;
    let skipCount = 0;

    // วิเคราะห์และอัพเดตข้อมูล
    borrowersSnapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      
      // ตรวจสอบว่ามี userId แต่ไม่มี lineUserId
      if (data.userId && !data.lineUserId) {
        console.log(`🔄 Updating document ${docId}: adding lineUserId = ${data.userId.substring(0, 10)}...`);
        
        batch.update(doc.ref, { 
          lineUserId: data.userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          fixedLineUserId: true // Flag to track that this was fixed
        });
        
        updateCount++;
      } else if (data.lineUserId) {
        console.log(`✅ Document ${docId}: already has lineUserId`);
        skipCount++;
      } else {
        console.log(`⚠️  Document ${docId}: missing both userId and lineUserId`);
        skipCount++;
      }
    });

    // Execute batch update
    if (updateCount > 0) {
      console.log(`💾 Committing batch update for ${updateCount} documents...`);
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} documents`);
    } else {
      console.log("ℹ️  No documents need updating");
    }

    console.log(`📈 Summary:
- Updated: ${updateCount} documents
- Skipped: ${skipCount} documents
- Total: ${borrowersSnapshot.size} documents`);

    // ตรวจสอบผลลัพธ์
    console.log("\n🔍 Verification - checking updated documents...");
    
    const verificationSnapshot = await db.collection('borrowers')
      .where('fixedLineUserId', '==', true)
      .get();
      
    console.log(`✅ Verification: ${verificationSnapshot.size} documents were marked as fixed`);

    // แสดงตัวอย่างข้อมูลที่แก้ไขแล้ว
    if (!verificationSnapshot.empty) {
      console.log("\n📋 Sample fixed data:");
      verificationSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${doc.id}: userId=${data.userId?.substring(0, 10)}..., lineUserId=${data.lineUserId?.substring(0, 10)}...`);
      });
    }

  } catch (error) {
    console.error("❌ Error fixing borrower records:", error);
  }

  console.log("✅ Fix process completed");
  process.exit(0);
}

// เรียกใช้ฟังก์ชัน
fixExistingBorrowerRecords();
