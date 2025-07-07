# BaanTK Enhanced LINE Bot System 🏠🤖

> ระบบจัดการสินเชื่อด่วยที่ปรับปรุงใหม่ พร้อมฟีเจอร์การตรวจสอบสถานะและการส่งสลีปการชำระเงินผ่าน LINE

## 🆕 ฟีเจอร์ใหม่ที่เพิ่มเข้ามา

### 🔍 ระบบตรวจสอบสถานะขั้นสูง
- **ตรวจสอบด้วย LINE User ID**: แสดงสถานะการกู้ปัจจุบันทันที
- **ตรวจสอบด้วยเลขบัตรประชาชน**: สำหรับผู้ที่ไม่เคยใช้ LINE นี้สมัคร
- **แสดงข้อมูลครบถ้วน**: ชื่อ-นามสกุล, วงเงิน, สถานะ, รูปแบบการชำระ
- **ปุ่มดำเนินการ**: ชำระเงิน, ส่งสลีป, ติดต่อเจ้าหน้าที่

### 📎 ระบบส่งสลีปการชำระเงิน
- **อัปโหลดรูปภาพ**: ส่งสลีปผ่าน LINE Chat โดยตรง
- **บันทึกอัตโนมัติ**: ระบบบันทึกใน Firebase Storage
- **แจ้งเตือนการรับ**: ยืนยันการรับสลีปและขั้นตอนต่อไป
- **ติดตามสถานะ**: เจ้าหน้าที่ตรวจสอบและอัปเดตสถานะ

### 🔔 การแจ้งเตือนอัตโนมัติ
- **แจ้งล่วงหน้า**: พรุ่งนี้ครบกำหนดชำระ
- **แจ้งวันครบกำหนด**: วันนี้ต้องชำระ
- **แจ้งเกินกำหนด**: สูงสุด 7 วันหลังเกินกำหนด
- **QR Code PromptPay**: ชำระเงินทันทีด้วย QR Code

## 🚀 การใช้งานด่วน

### สำหรับผู้ใช้ (ลูกค้า)

#### 1. ตรวจสอบสถานะการสมัคร
```
1. กดปุ่ม "ตรวจสอบสถานะ" ในเมนูหลัก
2. หากไม่พบข้อมูล ระบบจะขอเลขบัตรประชาชน
3. ส่งเลขบัตรประชาชน 13 หลัก
4. ระบบแสดงสถานะและรายละเอียด
```

#### 2. ส่งสลีปการชำระเงิน
```
1. กดปุ่ม "ส่งสลีป" หรือ "ชำระเงิน"
2. ถ่ายรูปสลีปการโอนเงิน
3. ส่งรูปมาในแชท LINE
4. ระบบยืนยันการรับและแจ้งขั้นตอนต่อไป
```

#### 3. รับการแจ้งเตือน
```
- ระบบแจ้งเตือนอัตโนมัติเมื่อใกล้ครบกำหนดชำระ
- คลิก QR Code เพื่อชำระเงินผ่าน PromptPay
- กดปุ่ม "ส่งสลีป" หลังชำระเงิน
```

### สำหรับเจ้าหน้าที่ (Admin)

#### 1. ตรวจสอบสลีปที่อัปโหลด
```
- เข้าระบบ Admin Panel
- ดูสลีปใน Firebase Storage
- ตรวจสอบข้อมูลใน collection 'payment_slips'
- อัปเดตสถานะ: approved, rejected
```

#### 2. จัดการการแจ้งเตือน
```
- ระบบส่งแจ้งเตือนอัตโนมัติทุกวันเวลา 09:00
- ตรวจสอบ log ใน Firebase Functions
- ดูสถิติการส่งแจ้งเตือนใน Console
```

## 🛠️ การติดตั้งและ Setup

### 1. ข้อกำหนดของระบบ
```bash
Node.js >= 20.0.0
npm >= 8.0.0
Firebase CLI >= 14.9.0
```

### 2. ติดตั้ง Dependencies
```bash
npm run setup
```

### 3. ตั้งค่า Environment Variables
```bash
cp functions/.env.example functions/.env
# แก้ไขค่าในไฟล์ .env
```

#### ตัวอย่าง Environment Variables:
```env
# LINE Configuration
CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
CHANNEL_SECRET=your-line-channel-secret

# Firebase Configuration  
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# PromptPay Configuration
PROMPTPAY_PHONE=0858294254

# Interest Rates
DAILY_INTEREST_RATE=0.20
WEEKLY_INTEREST_RATE=0.15
MONTHLY_INTEREST_RATE=0.10
```

### 4. การ Deploy
```bash
# ใช้ script การ deploy ที่ปรับปรุงแล้ว
./deploy-enhanced.sh

# หรือ deploy แยกส่วน
npm run deploy:functions    # Deploy functions เท่านั้น
npm run deploy:hosting      # Deploy hosting เท่านั้น
npm run deploy:firestore    # Deploy firestore rules เท่านั้น
```

## 🧪 การทดสอบ

### รันการทดสอบทั้งหมด
```bash
node test-line-enhancements.js
```

### ทดสอบส่วนประกอบแยก
```bash
# ทดสอบ security
npm run security-check

# ทดสอบ functions
npm run test:unit

# ทดสอบระบบทั้งหมด
npm run test:integration
```

## 📊 โครงสร้างข้อมูลใหม่

### Collection: `payment_slips`
```javascript
{
  userId: "U1234567890...",           // LINE User ID
  imageUrl: "payment-slips/userId/timestamp.jpg", // ไฟล์ใน Storage  
  uploadedAt: Timestamp,              // วันที่อัปโหลด
  status: "pending_review",           // สถานะ: pending_review, approved, rejected
  messageId: "LINE_MESSAGE_ID",       // ID ของข้อความ LINE
  reviewedBy: "admin_user_id",        // ผู้ตรวจสอบ (เมื่อมีการตรวจสอบ)
  reviewedAt: Timestamp,              // วันที่ตรวจสอบ
  notes: "หมายเหตุจากเจ้าหน้าที่"     // หมายเหตุ
}
```

### อัปเดต Collection: `borrowers`
```javascript
{
  // ...existing fields...
  
  // เพิ่มฟิลด์ใหม่สำหรับการติดตาม
  lastStatusCheck: Timestamp,         // ครั้งล่าสุดที่ตรวจสอบสถานะ
  paymentSlipsCount: Number,          // จำนวนสลีปที่ส่งมา
  lastPaymentSlip: Timestamp,         // วันที่ส่งสลีปล่าสุด
  notificationsSent: Number,          // จำนวนการแจ้งเตือนที่ส่ง
  lastNotification: Timestamp         // การแจ้งเตือนล่าสุด
}
```

## 🔧 API Reference

### ฟังก์ชันใหม่ใน `line-auto-reply.js`

#### Status Checking Functions
```javascript
// ตรวจสอบสถานะผู้ใช้ปัจจุบัน
checkCurrentUserStatus(userId)

// ตรวจสอบสถานะด้วยเลขบัตรประชาชน  
checkLoanStatusByIdCard(idCard, userId)

// สร้างข้อความแสดงสถานะ
createUserStatusMessage(borrowerData, isFromIdCard)
```

#### Image Handling Functions
```javascript
// จัดการข้อความรูปภาพ (สลีป)
handleImageMessage(event)

// สร้างคำแนะนำการอัปโหลดสลีป
createSlipUploadInstructions()

// สร้างข้อความยืนยันการรับสลีป
createSlipConfirmationMessage()
```

#### Notification Functions  
```javascript
// ส่งการแจ้งเตือนครบกำหนดชำระ
sendPaymentDueNotification(borrowerData)

// ตรวจสอบและส่งการแจ้งเตือนอัตโนมัติ
checkAndSendDueNotifications()

// สร้างรายละเอียดการชำระเงิน
createPaymentDetailsMessage(userId)
```

## 🔒 ความปลอดภัย

### มาตรการรักษาความปลอดภัยที่เพิ่ม
- ✅ การเข้ารหัสข้อมูลสำคัญ
- ✅ ตรวจสอบสิทธิ์การเข้าถึงรูปภาพ
- ✅ Rate limiting สำหรับการอัปโหลดรูปภาพ
- ✅ Validation ข้อมูลที่รับจาก LINE
- ✅ บันทึก audit log ทุกการทำงาน

### Firebase Security Rules

#### Storage Rules สำหรับ Payment Slips
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /payment-slips/{userId}/{filename} {
      allow read, write: if request.auth != null 
        && (request.auth.uid == userId || 
            request.auth.token.admin == true);
    }
  }
}
```

#### Firestore Rules สำหรับ Payment Slips
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /payment_slips/{document} {
      allow read, write: if request.auth != null 
        && (resource.data.userId == request.auth.uid || 
            request.auth.token.admin == true);
    }
  }
}
```

## 📈 การปรับปรุงในอนาคต

### Phase 2 - ระบบขั้นสูง
- [ ] ระบบยืนยันตัวตนด้วย OTP
- [ ] การแจ้งเตือนผ่าน Email และ SMS
- [ ] Dashboard แบบ Real-time สำหรับ Admin
- [ ] API สำหรับ Mobile App

### Phase 3 - AI และ Automation
- [ ] AI สำหรับตรวจสอบสลีปอัตโนมัติ
- [ ] ระบบคะแนนความน่าเชื่อถือ
- [ ] การผูกบัญชีธนาคารโดยตรง
- [ ] Chatbot ขั้นสูงด้วย NLP

## 🐛 การแก้ไขปัญหา

### ปัญหาที่พบบ่อยและวิธีแก้ไข

#### 1. LINE Bot ไม่ตอบกลับ
```bash
# ตรวจสอบ webhook URL
firebase functions:log

# ตรวจสอบ LINE channel configuration
# ใน LINE Developers Console
```

#### 2. ไม่สามารถอัปโหลดรูปภาพได้
```bash
# ตรวจสอบ Storage rules
firebase deploy --only storage

# ตรวจสอบ permissions ใน Firebase Console
```

#### 3. การแจ้งเตือนไม่ทำงาน
```bash
# ตรวจสอบ scheduler function
firebase functions:log --only notifyDueDate

# ตรวจสอบการตั้งค่า timezone
```

#### 4. ข้อมูลสถานะไม่ถูกต้อง
```bash
# ตรวจสอบ Firestore indexes
firebase deploy --only firestore:indexes

# ตรวจสอบข้อมูลใน Firebase Console
```

## 📞 การติดต่อและการสนับสนุน

### Development Team
- **Email**: support@baantk.com
- **LINE**: @baantk-support
- **GitHub**: https://github.com/Fouxth/BaanTK

### เอกสารเพิ่มเติม
- 📖 [API Documentation](./docs/API.md)
- 🔒 [Security Guide](./SECURITY.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- 🧪 [Testing Guide](./docs/TESTING.md)

---

## 📝 License

This project is proprietary software owned by BaanTK. All rights reserved.

---

**BaanTK Enhanced LINE Bot System** - พัฒนาด้วย ❤️ โดยทีม BaanTK Development

> ระบบสินเชื่อด่วนที่ปลอดภัย เชื่อถือได้ และใช้งานง่าย สำหรับทุกคนในยุคดิจิทัล
