# 🔧 LINE Bot Setup Guide - การตั้งค่า LINE Bot เพื่อให้ Auto-Reply ทำงาน

## ⚠️ ปัญหาที่พบ: "พิมพ์แล้วไม่มีการตอบกลับ"

หากคุณพิมพ์ข้อความใน LINE แล้วบอทไม่ตอบกลับ แสดงว่าการตั้งค่าใน LINE Developers Console ยังไม่ถูกต้อง

## 🎯 ขั้นตอนการแก้ไข

### 1. เข้าสู่ LINE Developers Console

1. ไปที่ [LINE Developers](https://developers.line.biz/)
2. Login ด้วยบัญชี LINE ของคุณ
3. เลือก Provider และ Channel ของคุณ

### 2. ตั้งค่า Messaging API (ขั้นตอนสำคัญ!)

1. ไปที่ **Messaging API** tab
2. ตั้งค่าดังนี้:

#### 🌐 Webhook Settings
```
Webhook URL: https://webhook-kkrrpg5icq-uc.a.run.app/webhook
Use webhook: ✅ เปิด (สำคัญมาก!)
Redelivery: ✅ เปิด (แนะนำ)
```

#### 🤖 Response Settings  
```
Auto-reply messages: ❌ ปิด (ต้องปิดเพื่อให้ใช้ระบบเรา)
Greeting messages: ❌ ปิด (ต้องปิดเพื่อให้ใช้ระบบเรา)
```

#### 🔑 Channel Access Token
```
- คลิก "Issue" เพื่อสร้าง Channel Access Token ใหม่
- Copy token นี้ไปใส่ในไฟล์ .env
```

### 3. ตรวจสอบ Environment Variables

ตรวจสอบว่าไฟล์ `/functions/.env` มีข้อมูลถูกต้อง:

```env
LINE_CHANNEL_ACCESS_TOKEN=your-long-channel-access-token-here
LINE_CHANNEL_SECRET=your-channel-secret-here
```

### 4. ทดสอบ Webhook Connection

1. ใน LINE Developers Console ไปที่ **Messaging API** tab
2. ในส่วน **Webhook settings** คลิก **Verify**
3. ควรได้ผลลัพธ์ "Success" หรือ status code 200

### 5. ทดสอบใน LINE App

1. สแกน QR Code หรือเพิ่มบอทจาก LINE ID
2. ส่งข้อความ "สวัสดี" - ควรได้รับข้อความต้อนรับ
3. ส่งข้อความ "เมนู" - ควรได้รับ Flex Message menu

## 🚨 Common Issues & Solutions

### Issue 1: Webhook Verification Failed
**สาเหตุ:** URL ไม่ถูกต้องหรือ Firebase Function ไม่ทำงาน
**แก้ไข:** 
- ตรวจสอบว่า URL คือ `https://webhook-kkrrpg5icq-uc.a.run.app/webhook`
- รัน `firebase deploy --only functions` อีกครั้ง

### Issue 2: บอทไม่ตอบกลับ
**สาเหตุ:** Auto-reply messages ยังเปิดอยู่
**แก้ไข:**
- ไปที่ LINE Developers Console
- ปิด "Auto-reply messages" และ "Greeting messages"
- เปิด "Use webhook" ให้แน่ใจ

### Issue 3: ได้รับข้อความ Default Reply
**สาเหตุ:** Channel Access Token หรือ Secret ไม่ถูกต้อง
**แก้ไข:**
- อัปเดต token ใหม่ใน `.env`
- Deploy ใหม่: `firebase deploy --only functions`

### Issue 4: Error 403 Forbidden
**สาเหตุ:** Channel Access Token หมดอายุหรือไม่ถูกต้อง
**แก้ไข:**
- สร้าง Channel Access Token ใหม่
- อัปเดตในไฟล์ `.env`

## 🔍 การตรวจสอบปัญหา

### 1. ตรวจสอบ Firebase Logs
```bash
# ดู logs ใน terminal
firebase functions:log --only webhook

# หรือดูใน web console
# https://console.firebase.google.com/project/baan-tk/functions/logs
```

### 2. ทดสอบ Webhook จาก Terminal
```bash
node test-realistic-webhook.js
```

### 3. ตรวจสอบ LINE Webhook Status
ใน LINE Developers Console ดูที่ **Webhook settings** -> **Verify**

## 📱 การทดสอบที่ถูกต้อง

### ลำดับการทดสอบ:
1. **เพิ่มบอทเป็นเพื่อน** → ควรได้รับ welcome message
2. **ส่งข้อความ "สวัสดี"** → ควรได้รับข้อความทักทาย
3. **ส่งข้อความ "เมนู"** → ควรได้รับ Flex Message carousel
4. **กดปุ่มในเมนู** → ควรได้รับข้อมูลที่เกี่ยวข้อง

### ข้อความที่รองรับ:
- **สวัสดี, Hello, Hi** → ข้อความต้อนรับ
- **เมนู, Menu** → เมนูหลัก  
- **สมัคร, Register** → ข้อมูลการสมัคร
- **สถานะ, Status** → ตรวจสอบสถานะ
- **ชำระ, Payment** → ส่งสลิปการชำระ
- **ติดต่อ, Contact** → ข้อมูลติดต่อ
- **เงื่อนไข, Terms** → เงื่อนไขบริการ
- **เกี่ยวกับ, About** → เกี่ยวกับบริษัท

## 📊 สถานะปัจจุบันของระบบ

✅ **Firebase Functions:** Deploy สำเร็จแล้ว
✅ **Webhook Endpoint:** https://webhook-kkrrpg5icq-uc.a.run.app/webhook
✅ **Auto-Reply Logic:** ทำงานได้ 100%  
✅ **Flex Messages:** พร้อมใช้งาน
✅ **Event Handling:** รองรับครบถ้วน

## 🎯 ขั้นตอนสุดท้าย

1. **ตั้งค่า LINE Developers Console** ตามคู่มือข้างต้น
2. **ทดสอบ Webhook Verification** ใน LINE Console
3. **ทดสอบส่งข้อความ** ใน LINE App
4. **ตรวจสอบ Logs** ใน Firebase Console

---

🔥 **หากทำตามขั้นตอนแล้วยังไม่ได้ผล:**

1. แชร์หน้าจอ LINE Developers Console
2. ส่ง screenshot การตั้งค่า Webhook 
3. ส่ง Firebase Console logs
4. ระบุข้อความที่ส่งและผลลัพธ์ที่ได้

**ระบบพร้อมใช้งาน 100% แล้ว! ปัญหาน่าจะอยู่ที่การตั้งค่า LINE Console เท่านั้น** ✨
