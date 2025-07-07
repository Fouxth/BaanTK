// functions/dueNotifier.js - Enhanced with improved notification system
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { sendPaymentDueNotification } = require("./line-auto-reply");

// 🔥 ต้อง initialize Firebase App ก่อนใช้
if (!getApps().length && process.env.GOOGLE_PROJECT_ID) {
  initializeApp({
    credential: cert({
      projectId: process.env.GOOGLE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || ""
    })
  });
}

const db = getFirestore();

// Enhanced notification scheduler using the new notification system
exports.notifyDueDate = onSchedule("0 9 * * *", async (event) => {
  console.log("🔔 Running enhanced daily due reminder...");
  
  try {
    const today = new Date();
    const snapshot = await db.collection("borrowers")
      .where("status", "==", "approved")
      .get();

    const tasks = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dueDate = data.dueDate?.toDate?.() || new Date();
      const diffTime = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

      // แจ้งเตือน: วันนี้, พรุ่งนี้, หรือเกินกำหนดไม่เกิน 7 วัน
      if (diffTime <= 1 && diffTime >= -7) {
        console.log(`📅 Sending notification for user ${data.userId}, due in ${diffTime} days`);
        tasks.push(sendPaymentDueNotification(data));
      }
    });

    const results = await Promise.allSettled(tasks);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Notification summary: ${successful} sent, ${failed} failed`);
    
    return {
      success: true,
      notificationsSent: successful,
      notificationsFailed: failed
    };

  } catch (error) {
    console.error("❌ Error in notification scheduler:", error);
    return {
      success: false,
      error: error.message
    };
  }
});
