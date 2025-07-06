// functions/dueNotifier.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Client } = require("@line/bot-sdk");

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
const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
});

exports.notifyDueDate = onSchedule("every 24 hours", async (event) => {
  const today = new Date();
  const snapshot = await db.collection("borrowers").get();
  const tasks = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const dueDate = data.dueDate?.toDate?.() || new Date();
    const diffTime = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffTime <= 1 && data.status === "approved") {
      const interest = data.totalLoan * data.interestRate;
      const totalDue = data.totalLoan + interest;

      const message = {
        type: "flex",
        altText: "แจ้งเตือนครบกำหนดชำระ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "📢 แจ้งเตือนชำระเงิน", weight: "bold", size: "lg" },
              { type: "text", text: `คุณ ${data.firstName} ${data.lastName}` },
              { type: "text", text: `ยอดที่ต้องชำระ: ${totalDue.toFixed(2)} บาท` },
              { type: "text", text: `ครบกำหนดวันที่: ${dueDate.toLocaleDateString()}` }
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
});
