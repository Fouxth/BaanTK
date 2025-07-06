// 🔄 Updated LINE Loan Bot with extra fields + QR + Status Handling
require("dotenv").config();
const { middleware, Client } = require("@line/bot-sdk");
const admin = require("firebase-admin");

const functions = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Import custom modules
const { approvedFlex, dueReminderFlex, paymentSlipReceivedFlex } = require("./statusFlex");
const flexRegisterTemplate = require("./flexRegisterTemplate");
const welcomeFlex = require("./welcomeFlex");
const menuFlex = require("./menuFlex");
const uploadImageFromLine = require("./uploadToStorage");
const { notifyDueDate } = require("./dueNotifier");

// Import DataManager (will create if not exists)
let DataManager;
try {
  DataManager = require("./utils/dataManager");
} catch (error) {
  console.log("⚠️ DataManager not found, creating basic fallback...");
  DataManager = {
    calculateCreditScore: () => 600,
    checkBlacklist: () => ({ isBlacklisted: false }),
    shouldAutoApprove: () => false,
    generateAdvancedReport: () => ({}),
    calculateOverdueInterest: () => ({ overdueDays: 0, penalty: 0, totalOwed: 0 }),
    sendEscalatedReminder: () => true,
    addToBlacklist: () => true
  };
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.GOOGLE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    }),
    storageBucket: "baan-tk.appspot.com" // ✅ ถ้าน้องใช้ Storage ด้วย
  });
}
const db = admin.firestore();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new Client(config);

const app = express();
app.use(express.json());
app.use(bodyParser.raw({ type: "*/*" }));
app.use(middleware(config));

// ✅ CORS Configuration
app.use(cors({
  origin: [
    "https://baan-tk.web.app",
    "https://baan-tk.firebaseapp.com",
    "https://liff.line.me",
    "http://localhost:3000", // สำหรับ development
    "http://localhost:5000" // สำหรับ Firebase emulator
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true
});

app.use("/api/", limiter);
app.use("/api/auth/", authLimiter);

// ✅ Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

// ✅ Input Validation Middleware
function validateBorrowerData(req, res, next) {
  const { firstName, lastName, birthDate, idCard, address, amount, frequency } = req.body;

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!firstName || !lastName || !birthDate || !idCard || !address || !amount || !frequency) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // ตรวจสอบเลขบัตรประชาชน
  if (!/^\d{13}$/.test(idCard)) {
    return res.status(400).json({ error: "Invalid ID card number" });
  }

  // ตรวจสอบจำนวนเงิน
  const loanAmount = parseFloat(amount);
  if (isNaN(loanAmount) || loanAmount <= 0 || loanAmount > 50000) {
    return res.status(400).json({ error: "Invalid loan amount" });
  }

  // ตรวจสอบรูปแบบการชำระ
  if (!["daily", "weekly", "monthly"].includes(frequency)) {
    return res.status(400).json({ error: "Invalid payment frequency" });
  }

  next();
}

// ✅ Admin Authentication Middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7);

  // ตรวจสอบ token (ในที่นี้ใช้ token ง่ายๆ สำหรับ demo)
  // ในการใช้งานจริงควรใช้ JWT หรือ Firebase Auth
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }

  next();
}

// ✅ Logging Middleware
function logRequest(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
}

app.use(logRequest);

app.post("/webhook", async (req, res) => {
  try {
    const events = req.body.events;
    console.log("📩 Received webhook events:", JSON.stringify(events, null, 2));

    await Promise.all(
      events.map(async (event) => {
        const userId = event.source.userId;
        console.log(`📱 Processing event for user: ${userId}, type: ${event.type}`);

        if (event.type === "follow") {
          console.log("👋 New follower, sending welcome message");
          await client.replyMessage(event.replyToken, {
            type: "flex",
            altText: "ยินดีต้อนรับ",
            contents: welcomeFlex
          });
          return;
        }

        if (event.type === "message" && event.message.type === "text") {
          const text = event.message.text.trim();
          console.log(`💬 Received text message: "${text}"`);

          if (text === "ลงทะเบียน") {
            console.log("🎯 Handling register request");
            try {
              return client.replyMessage(event.replyToken, {
                type: "flex",
                altText: flexRegisterTemplate.altText,
                contents: flexRegisterTemplate
              });
            } catch (registerError) {
              console.error("❌ Register error:", registerError);
              return client.replyMessage(event.replyToken, {
                type: "text",
                text: "📝 ลงทะเบียนผู้กู้เงิน\n\nกรุณาติดต่อแอดมินเพื่อดำเนินการลงทะเบียน หรือลองใหม่อีกครั้ง"
              });
            }
          }

          if (text === "เมนู") {
            console.log("🎯 Handling menu request");
            try {
              console.log("menuFlex structure:", JSON.stringify(menuFlex, null, 2));
              return client.replyMessage(event.replyToken, {
                type: "flex",
                altText: menuFlex.altText,
                contents: menuFlex
              });
            } catch (menuError) {
              console.error("❌ Menu error:", menuError);
              return client.replyMessage(event.replyToken, {
                type: "text",
                text: "📱 เมนูหลัก\n\n1. ลงทะเบียน - สมัครกู้เงิน\n2. สถานะ - ตรวจสอบสถานะ\n3. อัปโหลดบัตร - แนบบัตรประชาชน"
              });
            }
          }

          // 🔘 แจ้งสถานะ
          if (text === "สถานะ") {
            const borrowerSnap = await db.collection("borrowers").where("userId", "==", userId).limit(1).get();

            if (!borrowerSnap.empty) {
              const b = borrowerSnap.docs[0].data();

              // 🔁 แปลง dueDate ให้เป็น string ที่อ่านง่าย
              const dueDateStr = b.dueDate?.toDate?.().toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric"
              }) || "ยังไม่กำหนด";

              // ✅ คำนวณยอดรวมที่ต้องชำระ
              const total = b.totalLoan + (b.totalLoan * b.interestRate);
              const formattedTotal = total.toLocaleString(undefined, { minimumFractionDigits: 2 });

              const statusFlex = {
                type: "flex",
                altText: "รายละเอียดสถานะของคุณ",
                contents: {
                  type: "bubble",
                  header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "text",
                        text: "📋 สถานะการกู้เงิน",
                        weight: "bold",
                        size: "lg",
                        color: "#1DB446"
                      }
                    ]
                  },
                  body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          { type: "text", text: "ชื่อ", size: "sm", color: "#aaaaaa", flex: 2 },
                          { type: "text", text: `${b.firstName} ${b.lastName}`, size: "sm", color: "#000000", flex: 5 }
                        ]
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          { type: "text", text: "จำนวนเงิน", size: "sm", color: "#aaaaaa", flex: 2 },
                          { type: "text", text: `${b.totalLoan.toLocaleString()} บาท`, size: "sm", color: "#000000", flex: 5 }
                        ]
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          { type: "text", text: "ดอกเบี้ย", size: "sm", color: "#aaaaaa", flex: 2 },
                          { type: "text", text: `${(b.interestRate * 100).toFixed(2)}%`, size: "sm", color: "#000000", flex: 5 }
                        ]
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          { type: "text", text: "ยอดชำระ", size: "sm", color: "#aaaaaa", flex: 2 },
                          { type: "text", text: `${formattedTotal} บาท`, size: "sm", color: "#D91E18", flex: 5 }
                        ]
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          { type: "text", text: "ครบกำหนด", size: "sm", color: "#aaaaaa", flex: 2 },
                          { type: "text", text: dueDateStr, size: "sm", color: "#000000", flex: 5 }
                        ]
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          { type: "text", text: "สถานะ", size: "sm", color: "#aaaaaa", flex: 2 },
                          { type: "text", text: `${b.status || "รออนุมัติ"}`, size: "sm", color: "#000000", flex: 5 }
                        ]
                      }
                    ]
                  },
                  footer: {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    contents: [
                      {
                        type: "button",
                        style: "primary",
                        color: "#1DB446",
                        action: {
                          type: "uri",
                          label: "📥 ชำระผ่าน PromptPay",
                          uri: `https://promptpay.io/0858294254/${total.toFixed(2)}`
                        }
                      },
                      {
                        type: "button",
                        style: "secondary",
                        action: {
                          type: "message",
                          label: "แนบสลิปโอน",
                          text: `ชำระ:${dueDateStr} จำนวน:${total.toFixed(2)}`
                        }
                      }
                    ]
                  }
                }
              };

              await client.replyMessage(event.replyToken, statusFlex);
            } else {
              await client.replyMessage(event.replyToken, {
                type: "text",
                text: "❌ ไม่พบข้อมูลของคุณ กรุณาลงทะเบียนก่อนครับ"
              });
            }
            return;
          }

          // อัปโหลดบัตร
          if (text === "อัปโหลดบัตร") {
            await client.replyMessage(event.replyToken, {
              type: "text",
              text: "📸 กรุณาส่งรูปบัตรประชาชนของคุณมาในแชทนี้ เพื่อดำเนินการอัปโหลดเข้าสู่ระบบ"
            });
            return;
          }

          // 🔘 ลงทะเบียนแบบเต็ม
          if (
            text.includes("ชื่อ:") &&
                    text.includes("นามสกุล:") &&
                    text.includes("เกิด:") &&
                    text.includes("บัตร:") &&
                    text.includes("ที่อยู่:") &&
                    text.includes("จำนวน:") &&
                    text.includes("แบบ:")
          ) {
            const data = extractFullData(text);
            if (!data) {
              await client.replyMessage(event.replyToken, {
                type: "text",
                text: "⚠️ ข้อมูลไม่ครบถ้วนหรือลำดับไม่ถูกต้อง"
              });
              return;
            }

            const existing = await db.collection("borrowers").where("userId", "==", userId).limit(1).get();
            if (!existing.empty) {
              await client.replyMessage(event.replyToken, {
                type: "text",
                text: `ℹ️ คุณได้กรอกข้อมูลไว้แล้ว`
              });
              return;
            }

            if (existing.empty) {
            // ตรวจเลขบัตร
              if (data.idCard.length !== 13 || !/^\d{13}$/.test(data.idCard)) {
                await client.replyMessage(event.replyToken, {
                  type: "text",
                  text: "⛔️ เลขบัตรประชาชนต้องมี 13 หลัก และเป็นตัวเลขเท่านั้น"
                });
                return;
              }

              if (!["daily", "weekly", "monthly"].includes(data.frequency)) {
                await client.replyMessage(event.replyToken, {
                  type: "text",
                  text: "⚠️ โปรดระบุรูปแบบชำระเป็น: แบบ:รายวัน / แบบ:รายอาทิตย์ / แบบ:รายเดือน"
                });
                return;
              }

              // ✅ กำหนดอัตราดอกเบี้ยตามรูปแบบ
              let interestRate = 0.10; // default monthly
              if (data.frequency === "daily") interestRate = 0.20;
              else if (data.frequency === "weekly") interestRate = 0.15;

              const today = new Date();
              const dueDate = new Date(today);
              if (data.frequency === "daily") {
                dueDate.setDate(today.getDate() + 1);
              } else if (data.frequency === "weekly") {
                dueDate.setDate(today.getDate() + 7);
              } else {
                dueDate.setMonth(today.getMonth() + 1);
              }


              await db.collection("borrowers").add({
                ...data,
                interestRate,
                dueDate: admin.firestore.Timestamp.fromDate(dueDate),
                paid: 0,
                status: "pending",
                userId,
                createdAt: admin.firestore.Timestamp.fromDate(today)
              });

              await client.replyMessage(event.replyToken, {
                type: "text",
                text: `✅ ลงทะเบียนสำเร็จ คุณ ${data.firstName} ${data.lastName}`
              });
              return;
            }
          }

          // 🔘 แนบสลิป
          if (text.includes("ชำระ:") && text.includes("จำนวน:")) {
            const match = text.match(/ชำระ:(.*?)\s+จำนวน:(.*)/);
            if (match) {
              await db.collection("slips").add({
                userId,
                date: match[1].trim(),
                amount: parseFloat(match[2].trim()),
                createdAt: new Date(),
                status: "pending"
              });

              await client.replyMessage(event.replyToken, {
                type: "text",
                text: `📷 รับข้อมูลชำระแล้ว รอตรวจสอบ`
              });
              return;
            }
          }

          // กรณีไม่เข้าใจข้อความ
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: "⛔️ ไม่เข้าใจข้อความของคุณ กรุณาพิมพ์: เมนู หรือ ลงทะเบียน"
          });
          return;
        }

        // 🔘 จัดการรูปภาพ
        if (event.type === "message" && event.message.type === "image") {
          try {
            const messageId = event.message.id;
            const stream = await client.getMessageContent(messageId);

            const buffers = [];
            for await (const chunk of stream) {
              buffers.push(chunk);
            }

            const buffer = Buffer.concat(buffers);
            const filePath = `id-cards/${userId}_${Date.now()}.jpg`;
            const file = admin.storage().bucket().file(filePath);
            await file.save(buffer, { contentType: "image/jpeg" });
            await file.makePublic();
            const uploadUrl = `https://storage.googleapis.com/${file.bucket.name}/${file.name}`;

            await db.collection("images").add({
              userId,
              url: uploadUrl,
              createdAt: new Date()
            });

            // ✅ ตอบกลับด้วย Flex Message พร้อมภาพ
            const imageFlex = {
              type: "flex",
              altText: "📷 อัปโหลดสำเร็จ",
              contents: {
                type: "bubble",
                hero: {
                  type: "image",
                  url: uploadUrl,
                  size: "full",
                  aspectMode: "cover",
                  aspectRatio: "1:1"
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "📤 รับรูปภาพเรียบร้อยแล้ว",
                      size: "lg",
                      weight: "bold"
                    },
                    {
                      type: "text",
                      text: "กำลังดำเนินการตรวจสอบภายใน 24 ชม.",
                      size: "sm",
                      color: "#666666",
                      margin: "md"
                    }
                  ]
                },
                footer: {
                  type: "box",
                  layout: "vertical",
                  spacing: "sm",
                  contents: [
                    {
                      type: "button",
                      style: "primary",
                      color: "#1DB446",
                      action: {
                        type: "uri",
                        label: "🔍 ดูรูปที่ส่ง",
                        uri: uploadUrl
                      }
                    }
                  ]
                }
              }
            };

            await client.replyMessage(event.replyToken, imageFlex);
          } catch (error) {
            console.error("❌ Error uploading image:", error);
            await client.replyMessage(event.replyToken, {
              type: "text",
              text: "❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ"
            });
          }
          return;
        }
      })
    );

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

function extractFullData(text) {
  try {
    const patterns = {
      firstName: /ชื่อ:([^\n\r]*)/,
      lastName: /นามสกุล:([^\n\r]*)/,
      birthDate: /เกิด:([^\n\r]*)/,
      idCard: /บัตร:([^\n\r]*)/,
      address: /ที่อยู่:([^\n\r]*)/,
      amount: /จำนวน:([^\n\r]*)/,
      frequency: /แบบ:([^\n\r]*)/ // ✅ เพิ่มตรงนี้
    };

    const data = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (!match || !match[1]) return null;
      data[key] = match[1].trim();
    }

    data.totalLoan = parseFloat(data.amount);
    delete data.amount;

    // ✅ normalize frequency
    const freq = data.frequency.toLowerCase();
    if (["รายวัน", "daily"].includes(freq)) data.frequency = "daily";
    else if (["รายอาทิตย์", "weekly"].includes(freq)) data.frequency = "weekly";
    else data.frequency = "monthly"; // default ถ้าไม่ตรง

    return data;
  } catch (error) {
    console.error("❌ extractFullData error:", error);
    return null;
  }
}

// ✅ Apply validation middleware to registration endpoint
app.post("/api/liff-register", validateBorrowerData, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      birthDate,
      idCard,
      address,
      addressOnId,
      currentAddress,
      amount,
      frequency,
      userId,
      idCardImage,
      idCardImageName,
      idCardImageSize
    } = req.body;

    // ✅ validate
    if (!userId || !idCard || idCard.length !== 13) {
      return res
        .status(400)
        .json({ error: "ข้อมูลไม่ครบหรือเลขบัตรไม่ถูกต้อง" });
    }

    // ตรวจสอบข้อมูลที่อยู่
    const finalAddressOnId = addressOnId || address;
    const finalCurrentAddress = currentAddress || address;

    const today = new Date();
    const dueDate = new Date(today);

    const interestRate =
        frequency === "daily" ?
          0.2 :
          frequency === "weekly" ?
            0.15 :
            0.1;

    if (frequency === "daily") {
      dueDate.setDate(today.getDate() + 1);
    } else if (frequency === "weekly") {
      dueDate.setDate(today.getDate() + 7);
    } else {
      dueDate.setMonth(today.getMonth() + 1);
    }

    // คำนวณคะแนนเครดิต
    const creditScore = DataManager.calculateCreditScore({
      firstName,
      lastName,
      birthDate,
      idCard,
      requestedAmount: parseFloat(amount)
    });

    // เตรียมข้อมูลสำหรับบันทึก
    const borrowerData = {
      firstName,
      lastName,
      birthDate,
      idCard,
      address: finalAddressOnId, // เพื่อความเข้ากันได้
      addressOnId: finalAddressOnId,
      currentAddress: finalCurrentAddress,
      totalLoan: parseFloat(amount),
      requestedAmount: parseFloat(amount),
      frequency,
      interestRate,
      dueDate: admin.firestore.Timestamp.fromDate(dueDate),
      paid: 0,
      status: "pending",
      userId,
      creditScore,
      createdAt: admin.firestore.Timestamp.fromDate(today)
    };

    // เพิ่มข้อมูลรูปภาพหากมี
    if (idCardImage) {
      borrowerData.idCardImage = idCardImage;
      borrowerData.idCardImageName = idCardImageName;
      borrowerData.idCardImageSize = idCardImageSize;
      borrowerData.hasIdCardImage = true;
    }

    // ✅ บันทึก Firebase
    const docRef = await db.collection("borrowers").add(borrowerData);

    // ✅ ส่งข้อความเข้า LINE
    await client.pushMessage(userId, {
      type: "text",
      text: `✅ ลงทะเบียนสำเร็จแล้ว

📋 ข้อมูลที่ได้รับ:
• ชื่อ: ${firstName} ${lastName}
• เลขบัตร: ${idCard}
• จำนวนเงิน: ${new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)}
• รูปแบบชำระ: ${frequency === 'daily' ? 'รายวัน' : frequency === 'weekly' ? 'รายอาทิตย์' : 'รายเดือน'}
• คะแนนเครดิต: ${creditScore}
${idCardImage ? '• ✅ รูปบัตรประชาชน: อัปโหลดแล้ว' : ''}

⏳ สถานะ: รอการพิจารณา
📊 ระบบจะแจ้งผลการอนุมัติภายใน 24 ชั่วโมง`
    });

    res.status(200).json({ 
      success: true, 
      message: "ลงทะเบียนสำเร็จ",
      borrowerId: docRef.id,
      creditScore: creditScore
    });
  } catch (err) {
    console.error("❌ liff-register error", err);
    res.status(500).json({ error: "internal error" });
  }
});


app.post("/send-reminder", async (req, res) => {
  try {
    const today = new Date();
    const snapshot = await db.collection("borrowers")
      .where("status", "==", "approved")
      .get();

    const tasks = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const due = new Date(data.dueDate);
      const daysLate = Math.floor((today - due) / (1000 * 60 * 60 * 24));

      if (daysLate >= 0) {
        // ✅ คำนวณดอกเบี้ย
        const interest = daysLate * (data.dailyInterest || 10);
        const total = (data.outstanding || 0) + interest;

        // ✅ สร้าง QR PromptPay
        const qrUrl = `https://promptpay.io/0858294254/${total}`;

        // ✅ ส่ง Flex แจ้งเตือน
        await client.pushMessage(data.userId, {
          type: "flex",
          altText: "แจ้งเตือนชำระเงิน",
          contents: {
            type: "bubble",
            hero: {
              type: "image",
              url: qrUrl,
              size: "full",
              aspectMode: "cover",
              aspectRatio: "1:1"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "text", text: "📢 แจ้งเตือนชำระหนี้", weight: "bold", size: "lg" },
                { type: "text", text: `ยอดรวม: ${total.toLocaleString()} บาท`, margin: "md", size: "md" },
                { type: "text", text: `ดอกเบี้ยค้าง ${daysLate} วัน = ${interest} บาท`, size: "sm", color: "#999999" }
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
                    label: "สแกนเพื่อชำระ",
                    uri: qrUrl
                  },
                  color: "#1DB446"
                }
              ]
            }
          }
        });
      }
    });

    await Promise.all(tasks);
    res.send("🔔 ส่งแจ้งเตือนครบแล้ว");
  } catch (e) {
    console.error("❌ send-reminder error:", e);
    res.status(500).send("❌ ERROR");
  }
});


app.post("/check-due", async (req, res) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const snap = await db.collection("borrowers")
    .where("status", "==", "approved")
    .get();

  const reminders = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const due = data.dueDate.toDate();
    const dueStr = due.toISOString().split("T")[0];

    if (dueStr === todayStr) {
      reminders.push(
        client.pushMessage(data.userId, {
          type: "flex",
          altText: "แจ้งเตือนวันครบกำหนด",
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                { type: "text", text: "⏰ แจ้งเตือนครบกำหนด", weight: "bold", size: "lg" },
                { type: "text", text: `คุณมีการชำระเงินที่ครบกำหนดในวันนี้`, size: "md", margin: "md" },
                { type: "text", text: `ยอด: ${data.totalLoan + (data.totalLoan * data.interestRate)} บาท`, size: "sm", color: "#ff0000", margin: "sm" }
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
                    label: "ชำระเงินผ่าน QR",
                    uri: `https://promptpay.io/0858294254/${data.totalLoan + (data.totalLoan * data.interestRate)}`
                  },
                  color: "#1DB446"
                }
              ]
            }
          }
        })
      );
    }
  }

  await Promise.all(reminders);
  res.send("แจ้งเตือนสำเร็จแล้ว");
});


app.get("/api/admin/borrowers", async (req, res) => {
  const snap = await db.collection("borrowers").orderBy("createdAt", "desc").get();
  res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});

app.get("/api/admin/slips", async (req, res) => {
  const snap = await db.collection("slips").orderBy("createdAt", "desc").get();
  res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});

app.get("/api/admin/images", async (req, res) => {
  const snap = await db.collection("images").orderBy("createdAt", "desc").get();
  res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});


// ✅ API สำหรับอนุมัติหรือปฏิเสธการกู้
app.post("/api/admin/approve", async (req, res) => {
  const { borrowerId, action } = req.body; // action: "approve" หรือ "reject"
  try {
    const borrowerRef = db.collection("borrowers").doc(borrowerId);
    const borrowerSnap = await borrowerRef.get();

    if (!borrowerSnap.exists) return res.status(404).json({ error: "ไม่พบผู้กู้" });

    const borrower = borrowerSnap.data();

    // อัปเดตสถานะ
    const newStatus = action === "approve" ? "approved" : "rejected";
    const updateFields = { status: newStatus };
    if (action === "approve") {
      updateFields.approvedAt = admin.firestore.Timestamp.now();
    }
    await borrowerRef.update(updateFields);

    // แจ้งเตือนกลับไปหา user
    await client.pushMessage(borrower.userId, {
      type: "flex",
      altText: "ผลการอนุมัติ",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: action === "approve" ? "✅ อนุมัติสำเร็จ" : "❌ ไม่ผ่านการอนุมัติ",
              size: "lg",
              weight: "bold",
              color: action === "approve" ? "#1DB446" : "#D70000"
            },
            {
              type: "text",
              text: action === "approve" ?
                "เงินของคุณจะโอนเข้าภายใน 24 ชั่วโมง" :
                "กรุณาติดต่อแอดมินหรือลงทะเบียนใหม่",
              wrap: true,
              size: "sm"
            }
          ]
        }
      }
    });

    res.json({ success: true, status: newStatus });
  } catch (e) {
    console.error("❌ Error in approve API:", e);
    res.status(500).json({ error: "internal error" });
  }
});

// ✅ API สำหรับสร้างรายงานขั้นสูง
app.post("/api/admin/generate-report", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const report = await DataManager.generateAdvancedReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error("❌ Error generating report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ✅ API สำหรับตรวจสอบ Credit Score
app.post("/api/admin/credit-score", async (req, res) => {
  try {
    const { borrowerId } = req.body;
    const borrowerDoc = await db.collection("borrowers").doc(borrowerId).get();

    if (!borrowerDoc.exists) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    const borrowerData = borrowerDoc.data();
    const creditScore = DataManager.calculateCreditScore(borrowerData);
    const blacklistCheck = await DataManager.checkBlacklist(borrowerData.idCard);

    res.json({
      creditScore,
      blacklistStatus: blacklistCheck,
      autoApprove: DataManager.shouldAutoApprove(borrowerData)
    });
  } catch (error) {
    console.error("❌ Error calculating credit score:", error);
    res.status(500).json({ error: "Failed to calculate credit score" });
  }
});

// ✅ API สำหรับจัดการ Blacklist
app.post("/api/admin/blacklist", async (req, res) => {
  try {
    const { borrowerId, reason, action } = req.body;

    if (action === "add") {
      const borrowerDoc = await db.collection("borrowers").doc(borrowerId).get();
      if (!borrowerDoc.exists) {
        return res.status(404).json({ error: "Borrower not found" });
      }

      const success = await DataManager.addToBlacklist(borrowerDoc.data(), reason);
      res.json({ success });
    } else if (action === "remove") {
      const borrowerDoc = await db.collection("borrowers").doc(borrowerId).get();
      if (!borrowerDoc.exists) {
        return res.status(404).json({ error: "Borrower not found" });
      }

      const borrowerData = borrowerDoc.data();
      await db.collection("blacklist").where("idCard", "==", borrowerData.idCard).get()
        .then((snapshot) => {
          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          return batch.commit();
        });

      res.json({ success: true });
    }
  } catch (error) {
    console.error("❌ Error managing blacklist:", error);
    res.status(500).json({ error: "Failed to manage blacklist" });
  }
});

// ✅ API สำหรับส่งการแจ้งเตือนแบบขั้นตอน
app.post("/api/admin/send-reminder", async (req, res) => {
  try {
    const { borrowerId, level } = req.body;
    const borrowerDoc = await db.collection("borrowers").doc(borrowerId).get();

    if (!borrowerDoc.exists) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    const borrowerData = { id: borrowerId, ...borrowerDoc.data() };
    const success = await DataManager.sendEscalatedReminder(borrowerData, level);

    res.json({ success });
  } catch (error) {
    console.error("❌ Error sending reminder:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

// ✅ API สำหรับคำนวณดอกเบี้ยค้าง
app.get("/api/admin/calculate-overdue/:borrowerId", async (req, res) => {
  try {
    const { borrowerId } = req.params;
    const borrowerDoc = await db.collection("borrowers").doc(borrowerId).get();

    if (!borrowerDoc.exists) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    const borrowerData = borrowerDoc.data();
    const overdueInfo = DataManager.calculateOverdueInterest(borrowerData);

    res.json(overdueInfo);
  } catch (error) {
    console.error("❌ Error calculating overdue:", error);
    res.status(500).json({ error: "Failed to calculate overdue interest" });
  }
});

// ✅ API สำหรับสถิติ Dashboard
app.get("/api/admin/dashboard-stats", async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // สถิติพื้นฐาน
    const totalBorrowersSnap = await db.collection("borrowers").get();
    const pendingBorrowersSnap = await db.collection("borrowers").where("status", "==", "pending").get();
    const approvedBorrowersSnap = await db.collection("borrowers").where("status", "==", "approved").get();

    // สถิติรายเดือน
    const monthlyBorrowersSnap = await db.collection("borrowers")
      .where("createdAt", ">=", startOfMonth)
      .get();

    // คำนวณยอดเงิน
    let totalLoanAmount = 0;
    let totalOutstanding = 0;

    totalBorrowersSnap.forEach((doc) => {
      const data = doc.data();
      totalLoanAmount += data.totalLoan || 0;

      if (data.status === "approved") {
        totalOutstanding += (data.totalLoan || 0) + ((data.totalLoan || 0) * (data.interestRate || 0));
      }
    });

    // สถิติการชำระเงิน
    const paidSlipsSnap = await db.collection("slips").where("status", "==", "approved").get();
    let totalPaidAmount = 0;
    paidSlipsSnap.forEach((doc) => {
      totalPaidAmount += doc.data().amount || 0;
    });

    // ลูกค้าค้างชำระ
    let overdueCount = 0;
    approvedBorrowersSnap.forEach((doc) => {
      const data = doc.data();
      const dueDate = data.dueDate?.toDate?.() || new Date();
      if (today > dueDate) {
        overdueCount++;
      }
    });

    res.json({
      totalBorrowers: totalBorrowersSnap.size,
      pendingBorrowers: pendingBorrowersSnap.size,
      approvedBorrowers: approvedBorrowersSnap.size,
      monthlyNewBorrowers: monthlyBorrowersSnap.size,
      totalLoanAmount,
      totalOutstanding,
      totalPaidAmount,
      overdueCount,
      collectionRate: totalLoanAmount > 0 ? ((totalPaidAmount / totalLoanAmount) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ✅ API สำหรับส่งข้อความแจ้งเตือนเป็นกลุ่ม
app.post("/api/admin/bulk-notify", async (req, res) => {
  try {
    const { message, targetGroup } = req.body; // targetGroup: "all", "pending", "overdue"

    let query = db.collection("borrowers");

    switch (targetGroup) {
    case "pending":
      query = query.where("status", "==", "pending");
      break;
    case "overdue":
      query = query.where("status", "==", "approved");
      break;
            // "all" ไม่ต้องเพิ่ม where clause
    }

    const snapshot = await query.get();
    const tasks = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // ตรวจสอบเงื่อนไข overdue
      if (targetGroup === "overdue") {
        const dueDate = data.dueDate?.toDate?.() || new Date();
        if (new Date() <= dueDate) return; // skip ถ้าไม่ค้าง
      }

      tasks.push(
        client.pushMessage(data.userId, {
          type: "text",
          text: message
        })
      );
    });

    await Promise.all(tasks);
    res.json({ success: true, messagesSent: tasks.length });
  } catch (error) {
    console.error("❌ Error sending bulk notification:", error);
    res.status(500).json({ error: "Failed to send bulk notification" });
  }
});

// Add a simple health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "BaanTK LINE Bot API is running",
    timestamp: new Date().toISOString()
  });
});

// Add a simple test endpoint
app.get("/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Test endpoint working"
  });
});

exports.webhook = functions.https.onRequest(app);
