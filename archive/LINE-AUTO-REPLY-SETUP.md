# 🤖 BaanTK LINE Auto-Reply System - Setup Complete

## ✅ สถานะการติดตั้ง

ระบบ LINE Auto-Reply สำหรับ BaanTK ได้รับการติดตั้งและทดสอบเรียบร้อยแล้ว

### 🌐 Production URLs

- **Webhook URL**: `https://webhook-kkrrpg5icq-uc.a.run.app`
- **Health Check**: `https://webhook-kkrrpg5icq-uc.a.run.app/` (GET)
- **LINE Webhook**: `https://webhook-kkrrpg5icq-uc.a.run.app/webhook` (POST)
- **Admin API**: `https://adminapi-kkrrpg5icq-uc.a.run.app`

### 📱 LINE Webhook Endpoints

ระบบรองรับ Webhook endpoints หลายแบบ:
- `POST /` - Main webhook endpoint  
- `POST /webhook` - Alternative webhook endpoint
- `POST /line-webhook` - LINE-specific webhook endpoint

## 🎯 ฟีเจอร์ที่ทำงานได้

### ✅ Auto-Reply Messages
- **สวัสดี/Hello** - ข้อความต้อนรับ
- **เมนู/Menu** - แสดง Flex Message carousel menu
- **สมัคร/Register** - ข้อมูลการสมัครสินเชื่อ
- **สถานะ/Status** - ตรวจสอบสถานะการสมัคร
- **ชำระ/Payment** - ส่งหลักฐานการชำระ
- **ติดต่อ/Contact** - ข้อมูลติดต่อ
- **เงื่อนไข/Terms** - เงื่อนไขการให้บริการ
- **เกี่ยวกับ/About** - ข้อมูลบริษัท

### ✅ Event Handling
- **Follow Event** - เมื่อผู้ใช้เพิ่มบอท
- **Unfollow Event** - เมื่อผู้ใช้ block/unfollow
- **Text Message** - ข้อความธรรมดา
- **Postback Event** - การกดปุ่มใน Flex Message
- **Image Message** - รับรูปภาพ (สำหรับสลิปการชำระ)

### ✅ Admin Notifications
- **sendSlipApprovalNotification** - แจ้งเตือนอนุมัติ/ปฏิเสธสลิป
- **sendApplicationStatusNotification** - แจ้งเตือนสถานะการสมัคร

## 🔧 การตั้งค่า LINE Bot

### 1. ใน LINE Developers Console

1. ไปที่ [LINE Developers](https://developers.line.biz/)
2. เลือก Channel ของคุณ
3. ไปที่ **Messaging API** tab
4. ตั้งค่า **Webhook URL**: `https://webhook-kkrrpg5icq-uc.a.run.app/webhook`
5. เปิด **Use webhook**: ✅
6. เปิด **Auto-reply messages**: ❌ (ปิดเพื่อให้ใช้ระบบเราแทน)
7. เปิด **Greeting messages**: ❌ (ปิดเพื่อให้ใช้ระบบเราแทน)

### 2. Environment Variables (ที่จำเป็น)

```env
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_CHANNEL_SECRET=your-channel-secret
NODE_ENV=production
```

## 🧪 การทดสอบ

### ทดสอบ Webhook
```bash
node test-production-webhook.js
```

### ทดสอบใน LINE App
1. เพิ่มบอทเป็นเพื่อน (ควรได้รับข้อความต้อนรับ)
2. ส่งข้อความ "เมนู" (ควรได้รับ Flex Message carousel)
3. กดปุ่มในเมนู (ควรได้รับข้อมูลที่เกี่ยวข้อง)

## 📊 การตรวจสอบ Logs

### Firebase Console
- ไปที่ [Firebase Console](https://console.firebase.google.com/project/baan-tk/overview)
- เลือก **Functions** > **Logs**
- ดู logs ของ `webhook` function

### Common Log Messages
- `📨 LINE Webhook received at /webhook` - รับ webhook
- `✅ Event processed` - ประมวลผล event สำเร็จ
- `❌ Error processing LINE event` - เกิดข้อผิดพลาด

## 🔒 Security Features

- ✅ CORS middleware
- ✅ Helmet security headers  
- ✅ Rate limiting
- ✅ Request logging
- ✅ Signature verification (optional)
- ✅ Input validation

## 🚀 การ Deploy

```bash
# Deploy ระบบใหม่
firebase deploy --only functions

# Deploy เฉพาะ webhook
firebase deploy --only functions:webhook
```

## 📞 Support & Troubleshooting

### ปัญหาที่พบบ่อย

1. **Auto-reply ไม่ทำงาน**
   - ตรวจสอบ Webhook URL ใน LINE Developers
   - ตรวจสอบ Channel Access Token & Secret
   - ดู logs ใน Firebase Console

2. **Flex Message ไม่แสดง**
   - ตรวจสอบ JSON structure ของ Flex Message
   - ตรวจสอบ URL ของรูปภาพ

3. **Rate limit exceeded**
   - LINE API มี rate limit
   - ตรวจสอบการใช้งาน push message

### การติดต่อ Support
- เช็ค Firebase Console Logs
- ทดสอบด้วย `test-production-webhook.js`
- ตรวจสอบ LINE Bot Info ใน LINE Developers Console

## 📝 Notes

- ระบบใช้ Firebase Functions (2nd Gen) 
- Node.js 20 runtime
- Support Flex Messages, Rich Menu, และ Postback Events
- ระบบ auto-reply ทำงานแบบ real-time
- มี fallback สำหรับข้อความที่ไม่รู้จัก

---

🎉 **ระบบพร้อมใช้งานแล้ว!** 

สำหรับคำถามหรือปัญหาเพิ่มเติม กรุณาตรวจสอบ logs ใน Firebase Console หรือรันการทดสอบ
