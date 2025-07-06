// 🤖 LINE Auto-Reply Service for BaanTK
const { Client } = require("@line/bot-sdk");
const functions = require("firebase-functions");

// LINE Bot Configuration - try multiple sources
const LINE_CONFIG = {
  channelAccessToken: 
    functions.config().line?.channel_access_token || 
    process.env.LINE_CHANNEL_ACCESS_TOKEN || 
    process.env.CHANNEL_ACCESS_TOKEN ||
    "htsHzjHcSkA1Xu3Qtf7C/ZqRv+o0WFwCXCA93W1NPNEGJrH1YbPNsEc5GsYDsQu4L3GMybtuIYHG4I+4XPLFXLf04RKM5+rmLV/kYSuL2WsOHZNv0Dme3ebMtLDVdnLC2OSM2JA+gXHumzUlmOM2BwdB04t89/1O/w1cDnyilFU=",
  channelSecret: 
    functions.config().line?.channel_secret || 
    process.env.LINE_CHANNEL_SECRET || 
    process.env.CHANNEL_SECRET ||
    "87fe8316138c02b02a4e20dafde563fd"
};

console.log("🔧 LINE Config loaded:", {
  hasAccessToken: !!LINE_CONFIG.channelAccessToken,
  hasSecret: !!LINE_CONFIG.channelSecret,
  tokenLength: LINE_CONFIG.channelAccessToken?.length || 0
});

const lineClient = new Client(LINE_CONFIG);

// Auto-reply messages
const AUTO_REPLIES = {
  greeting: [
    "สวัสดีครับ! ยินดีต้อนรับสู่ BaanTK 🏠",
    "พวกเราพร้อมช่วยเหลือคุณในเรื่องสินเชื่อด่วน",
    "กดเมนูเพื่อดูบริการต่างๆ หรือพิมพ์ 'ช่วยเหลือ' เพื่อดูคำสั่งทั้งหมด"
  ],
  help: [
    "📋 คำสั่งที่ใช้ได้:",
    "• 'สมัคร' - สมัครสินเชื่อ",
    "• 'สถานะ' - ตรวจสอบสถานะ",
    "• 'ชำระ' - ส่งหลักฐานการชำระ",
    "• 'ติดต่อ' - ติดต่อเจ้าหน้าที่",
    "• 'เงื่อนไข' - ดูเงื่อนไขการให้บริการ"
  ],
  register: [
    "📝 การสมัครสินเชื่อ BaanTK",
    "คลิกลิงค์ด้านล่างเพื่อกรอกข้อมูลการสมัคร:",
    "https://baan-tk.web.app/liff-register.html",
    "",
    "💡 เตรียมเอกสาร:",
    "• บัตรประชาชน",
    "• หลักฐานที่อยู่",
    "• หลักฐานรายได้"
  ],
  status: [
    "🔍 ตรวจสอบสถานะการสมัคร",
    "กรุณาส่งเลขบัตรประชาชนของคุณ",
    "เพื่อให้เราตรวจสอบสถานะให้คุณ"
  ],
  payment: [
    "💰 ส่งหลักฐานการชำระเงิน",
    "กรุณาส่งรูปภาพสลิปการโอนเงิน",
    "พร้อมระบุยอดเงินและวันที่ชำระ"
  ],
  contact: [
    "📞 ติดต่อเจ้าหน้าที่ BaanTK",
    "• โทร: 02-123-4567",
    "• LINE: @baantk",
    "• Email: info@baantk.com",
    "• เวลาทำการ: จันทร์-ศุกร์ 8:00-17:00"
  ],
  terms: [
    "📋 เงื่อนไขการให้บริการ BaanTK",
    "• อายุ 20-65 ปี",
    "• มีรายได้ประจำ",
    "• วงเงิน 1,000-50,000 บาท",
    "• ดอกเบี้ย 10-20% ต่อเดือน",
    "• ระยะเวลาผ่อน 1-12 เดือน"
  ],
  default: [
    "ขออภัยครับ ไม่เข้าใจคำสั่งของคุณ 😅",
    "พิมพ์ 'ช่วยเหลือ' เพื่อดูคำสั่งที่ใช้ได้ทั้งหมด",
    "หรือติดต่อเจ้าหน้าที่โดยตรงที่ 02-123-4567"
  ]
};

// Process incoming LINE messages
async function processLineMessage(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const userId = event.source.userId;
  const messageText = event.message.text.toLowerCase().trim();
  
  console.log(`📱 LINE Message from ${userId}: ${messageText}`);

  // Determine response based on message content
  let replyMessages = [];
  
  if (messageText.includes("สวัสดี") || messageText.includes("hello") || messageText.includes("hi")) {
    replyMessages = AUTO_REPLIES.greeting;
  } else if (messageText.includes("ช่วยเหลือ") || messageText.includes("help") || messageText.includes("คำสั่ง")) {
    replyMessages = AUTO_REPLIES.help;
  } else if (messageText.includes("สมัคร") || messageText.includes("register") || messageText.includes("ลงทะเบียน")) {
    replyMessages = AUTO_REPLIES.register;
  } else if (messageText.includes("สถานะ") || messageText.includes("status") || messageText.includes("ตรวจสอบ")) {
    replyMessages = AUTO_REPLIES.status;
  } else if (messageText.includes("ชำระ") || messageText.includes("payment") || messageText.includes("โอน")) {
    replyMessages = AUTO_REPLIES.payment;
  } else if (messageText.includes("ติดต่อ") || messageText.includes("contact") || messageText.includes("โทร")) {
    replyMessages = AUTO_REPLIES.contact;
  } else if (messageText.includes("เงื่อนไข") || messageText.includes("terms") || messageText.includes("ดอกเบี้ย")) {
    replyMessages = AUTO_REPLIES.terms;
  } else {
    replyMessages = AUTO_REPLIES.default;
  }

  // Send reply messages
  if (replyMessages.length > 0) {
    const messages = replyMessages.map(text => ({ type: "text", text }));
    
    try {
      await lineClient.replyMessage(event.replyToken, messages);
      console.log(`✅ Sent ${messages.length} reply messages to ${userId}`);
      return { success: true, messagesSent: messages.length };
    } catch (error) {
      console.error("❌ Failed to send LINE reply:", error);
      return { success: false, error: error.message };
    }
  }

  return null;
}

// Send push message to specific user
async function sendPushMessage(userId, messages) {
  try {
    const messageObjects = messages.map(text => ({ type: "text", text }));
    await lineClient.pushMessage(userId, messageObjects);
    console.log(`✅ Sent push message to ${userId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send push message:", error);
    return { success: false, error: error.message };
  }
}

// Send broadcast message to all users
async function sendBroadcastMessage(messages) {
  try {
    const messageObjects = messages.map(text => ({ type: "text", text }));
    await lineClient.broadcast(messageObjects);
    console.log("✅ Sent broadcast message");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send broadcast message:", error);
    return { success: false, error: error.message };
  }
}

// Verify LINE webhook signature
function verifySignature(body, signature) {
  const crypto = require("crypto");
  const channelSecret = LINE_CONFIG.channelSecret;
  
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  
  return hash === signature;
}

module.exports = {
  processLineMessage,
  sendPushMessage,
  sendBroadcastMessage,
  verifySignature,
  AUTO_REPLIES
};
