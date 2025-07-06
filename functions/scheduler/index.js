// functions/scheduler/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Client } = require("@line/bot-sdk");

// Initialize Firebase if not already done
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.GOOGLE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

const db = getFirestore();
const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
});

// ✅ แจ้งเตือนวันครบกำหนดชำระ
exports.dailyDueReminder = onSchedule("0 9 * * *", async (event) => {
  console.log("🔔 Running daily due reminder...");

  const today = new Date();
  const snapshot = await db.collection("borrowers")
    .where("status", "==", "approved")
    .get();

  const tasks = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const dueDate = data.dueDate?.toDate?.() || new Date();
    const diffTime = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    // แจ้งเตือน 1 วัน ก่อนครบกำหนด และวันครบกำหนด
    if (diffTime <= 1 && diffTime >= 0) {
      const interest = data.totalLoan * data.interestRate;
      const totalDue = data.totalLoan + interest;

      const message = {
        type: "flex",
        altText: "แจ้งเตือนครบกำหนดชำระ",
        contents: {
          type: "bubble",
          hero: {
            type: "image",
            url: `https://promptpay.io/0858294254/${totalDue.toFixed(2)}`,
            size: "full",
            aspectRatio: "1:1",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: diffTime === 0 ? "📢 วันนี้ครบกำหนดชำระ!" : "⏰ พรุ่งนี้ครบกำหนดชำระ",
                weight: "bold",
                size: "lg",
                color: diffTime === 0 ? "#DC2626" : "#F59E0B"
              },
              { type: "text", text: `คุณ ${data.firstName} ${data.lastName}` },
              { type: "text", text: `ยอดที่ต้องชำระ: ${totalDue.toFixed(2)} บาท`, color: "#DC2626", weight: "bold" },
              { type: "text", text: `ครบกำหนดวันที่: ${dueDate.toLocaleDateString("th-TH")}` }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "uri",
                  label: "💳 ชำระเงินทันที",
                  uri: `https://promptpay.io/0858294254/${totalDue.toFixed(2)}`
                },
                color: "#1DB446"
              }
            ]
          }
        }
      };

      tasks.push(client.pushMessage(data.userId, message));
    }
  });

  await Promise.all(tasks);
  console.log(`✅ Sent ${tasks.length} due reminders`);
});

// ✅ แจ้งเตือนลูกค้าที่ค้างชำระ
exports.overdueReminder = onSchedule("0 10 * * *", async (event) => {
  console.log("🚨 Running overdue reminder...");

  const today = new Date();
  const snapshot = await db.collection("borrowers")
    .where("status", "==", "approved")
    .get();

  const tasks = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const dueDate = data.dueDate?.toDate?.() || new Date();
    const overdueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    // แจ้งเตือนลูกค้าค้างชำระ (1, 3, 7, 14, 30 วัน)
    if ([1, 3, 7, 14, 30].includes(overdueDays)) {
      const baseAmount = data.totalLoan + (data.totalLoan * data.interestRate);
      const penaltyRate = 0.05; // ค่าปรับ 5% ต่อวัน
      const penalty = baseAmount * penaltyRate * overdueDays;
      const totalOwed = baseAmount + penalty;

      const urgencyLevel = overdueDays <= 3 ? "เตือน" : overdueDays <= 14 ? "เร่งด่วน" : "ด่วนที่สุด";
      const urgencyColor = overdueDays <= 3 ? "#F59E0B" : overdueDays <= 14 ? "#EF4444" : "#991B1B";

      const message = {
        type: "flex",
        altText: `${urgencyLevel}: ค้างชำระ ${overdueDays} วัน`,
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `🚨 ${urgencyLevel}: ค้างชำระ ${overdueDays} วัน`,
                weight: "bold",
                size: "lg",
                color: urgencyColor
              },
              { type: "text", text: `คุณ ${data.firstName} ${data.lastName}` },
              { type: "text", text: `ยอดเดิม: ${baseAmount.toFixed(2)} บาท` },
              { type: "text", text: `ค่าปรับ: ${penalty.toFixed(2)} บาท`, color: "#DC2626" },
              { type: "text", text: `รวมทั้งสิ้น: ${totalOwed.toFixed(2)} บาท`, weight: "bold", color: "#DC2626" },
              { type: "text", text: "กรุณาติดต่อชำระโดยด่วน เพื่อหลีกเลี่ยงดำเนินการทางกฎหมาย", wrap: true, size: "sm", color: "#666666" }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "uri",
                  label: "💳 ชำระเงิน",
                  uri: `https://promptpay.io/0858294254/${totalOwed.toFixed(2)}`
                },
                color: urgencyColor
              },
              {
                type: "button",
                style: "link",
                action: {
                  type: "uri",
                  label: "📞 ติดต่อเจ้าหน้าที่",
                  uri: "tel:0858294254"
                }
              }
            ]
          }
        }
      };

      tasks.push(client.pushMessage(data.userId, message));
    }
  });

  await Promise.all(tasks);
  console.log(`🚨 Sent ${tasks.length} overdue reminders`);
});

// ✅ สรุปรายงานรายวันให้แอดมิน
exports.dailyReport = onSchedule("0 18 * * *", async (event) => {
  console.log("📊 Generating daily report...");

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // สถิติใหม่วันนี้
  const newBorrowersSnap = await db.collection("borrowers")
    .where("createdAt", ">=", startOfDay)
    .where("createdAt", "<", endOfDay)
    .get();

  // สลิปที่ส่งมาวันนี้
  const newSlipsSnap = await db.collection("slips")
    .where("createdAt", ">=", startOfDay)
    .where("createdAt", "<", endOfDay)
    .get();

  // ลูกค้าค้างชำระ
  const overdueSnap = await db.collection("borrowers")
    .where("status", "==", "approved")
    .get();

  let overdueCount = 0;
  let overdueAmount = 0;

  overdueSnap.forEach((doc) => {
    const data = doc.data();
    const dueDate = data.dueDate?.toDate?.() || new Date();
    if (today > dueDate) {
      overdueCount++;
      overdueAmount += (data.totalLoan + (data.totalLoan * data.interestRate));
    }
  });

  const reportText = `📊 รายงานประจำวัน ${today.toLocaleDateString("th-TH")}

🆕 ลูกค้าใหม่: ${newBorrowersSnap.size} ราย
📄 สลิปใหม่: ${newSlipsSnap.size} ใบ
⚠️ ลูกค้าค้างชำระ: ${overdueCount} ราย
💰 ยอดค้างรวม: ${overdueAmount.toLocaleString()} บาท

#BaanTK #DailyReport`;

  // ส่งให้แอดมิน (ใส่ User ID ของแอดมิน)
  const adminUserId = "ADMIN_USER_ID"; // เปลี่ยนเป็น User ID จริงของแอดมิน

  try {
    await client.pushMessage(adminUserId, {
      type: "text",
      text: reportText
    });
    console.log("✅ Daily report sent to admin");
  } catch (error) {
    console.error("❌ Failed to send daily report:", error);
  }
});

module.exports = {
  dailyDueReminder: exports.dailyDueReminder,
  overdueReminder: exports.overdueReminder,
  dailyReport: exports.dailyReport
};
