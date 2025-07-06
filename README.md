# 🏦 BaanTK - ระบบจัดการสินเชื่อออนไลน์แบบครบวงจร

![BaanTK Banner](baan-tk.png)

**ระบบสินเชื่อออนไลน์ที่ทันสมัย** พัฒนาด้วย Firebase, LINE Bot API และ LIFF พร้อม Admin Dashboard สำหรับจัดการธุรกิจสินเชื่อ

[![Firebase](https://img.shields.io/badge/Firebase-Functions-orange?logo=firebase)](https://firebase.google.com/)
[![LINE](https://img.shields.io/badge/LINE-Bot%20API-00C300?logo=line)](https://developers.line.biz/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 **Overview**

BaanTK เป็นระบบจัดการสินเชื่อออนไลน์ที่ครบวงจร รองรับการทำงานผ่าน LINE Bot, LIFF Application และ Admin Dashboard พร้อมระบบรักษาความปลอดภัยและการวิเคราะห์ข้อมูลขั้นสูง

### ✨ **Features**

#### 🤖 **LINE Bot Integration**
- **เมนูแบบ Carousel** - แสดงตัวเลือกการใช้งาน
- **ลงทะเบียนผ่าน LIFF** - กรอกข้อมูลแบบปลอดภัย พร้อมดึงข้อมูลจากทะเบียนราษฎร
- **ตรวจสอบสถานะ** - ดูสถานะการอนุมัติและยอดค้างชำระ
- **อัปโหลดเอกสาร** - ส่งรูปบัตรประชาชนและเอกสาร
- **ชำระผ่าน QR Code** - PromptPay integration
- **แจ้งเตือนอัตโนมัติ** - ระบบ Scheduler สำหรับวันครบกำหนด

#### 🏛️ **Government Registry Integration**
- **ตรวจสอบข้อมูลจากทะเบียนราษฎร** - ดึงข้อมูลจริงจากกรมการปกครอง
- **ตรวจสอบสถานะบัตรประชาชน** - ตรวจสอบการหมดอายุและสถานะการใช้งาน
- **เปรียบเทียบข้อมูล** - เปรียบเทียบข้อมูลที่กรอกกับข้อมูลจริงจากราชการ
- **ดึงประวัติสินเชื่อ** - เชื่อมต่อกับฐานข้อมูลสินเชื่อแห่งชาติ
- **ตรวจสอบที่อยู่** - ยืนยันที่อยู่จากข้อมูลทะเบียนบ้าน

#### �‍💼 **Admin Dashboard**
- **Dashboard ครบครัน** - สถิติ, กราฟ, KPIs
- **จัดการผู้กู้เงิน** - อนุมัติ/ปฏิเสธ คำขอเงินกู้
- **ระบบ Credit Scoring** - ประเมินความเสี่ยงด้วย AI
- **Blacklist Management** - จัดการลูกค้าปัญหา
- **Payment Tracking** - ติดตามการชำระเงิน
- **Advanced Reports** - รายงานวิเคราะห์ธุรกิจ

#### 🔒 **Security & Performance**
- **Rate Limiting** - ป้องกัน DDoS และ Brute Force
- **Input Validation** - ตรวจสอบข้อมูลป้อนเข้า
- **CORS Configuration** - ควบคุมการเข้าถึง
- **Admin Authentication** - ระบบ Token-based auth
- **Error Handling** - จัดการข้อผิดพลาดแบบครบถ้วน

---

## 📁 **Project Structure**

```
BaanTK/
├── 📂 functions/                     # Firebase Cloud Functions
│   ├── 🚀 index.js                   # Main API server & LINE webhook
│   ├── 🏛️ governmentAPI.js           # เชื่อมต่อกับระบบทะเบียนราษฎร
│   ├── 🔒 security.js                # ระบบรักษาความปลอดภัย
│   ├── ✅ validation.js              # ตรวจสอบข้อมูลป้อนเข้า
│   ├── 📊 creditScoring.js           # ระบบประเมินความเสี่ยง
│   ├── ⏰ dueNotifier.js             # ระบบแจ้งเตือนครบกำหนด
│   ├── 📱 menuFlex.js               # LINE Menu template
│   ├── 📝 flexRegisterTemplate.js   # Registration template
│   ├── 🎉 welcomeFlex.js            # Welcome message template
│   ├── 📊 statusFlex.js             # Status display template
│   ├── 📤 uploadToStorage.js        # File upload handler
│   ├── 📂 scheduler/                # Scheduled functions
│   ├── 📂 utils/                    # Utility modules
│   │   ├── 🧠 dataManager.js        # Advanced data processing
│   │   ├── 💾 storage.js            # File management
│   │   ├── 🔐 security.js           # Security utilities
│   │   └── ✅ validation.js         # Input validation
│   ├── 📂 test/                     # Test files
│   ├── 📦 package.json             # Dependencies
│   ├── 🔧 .env                     # Environment variables
│   └── 🔍 production-check.js      # System health check
├── 📂 public/                       # Static web files
│   ├── 🌐 liff-register.html        # LIFF registration form
│   ├── 👨‍💼 adminDashboard.html       # Admin control panel
│   └── 🐛 debug-admin.js           # Debug utilities
├── ⚙️ firebase.json                 # Firebase configuration
├── 🔒 firestore.rules              # Database security rules
├── 📁 storage.rules                # Storage security rules
├── 📊 firestore.indexes.json       # Database indexes
└── 📖 README.md                    # Documentation
```

---

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Node.js 18+ 
- Firebase CLI
- LINE Developer Account
- Firebase Project

### **1. Clone & Install**

```bash
# Clone repository
git clone https://github.com/your-username/BaanTK.git
cd BaanTK

# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install dependencies
cd functions
npm install
```

### **2. Firebase Setup**

```bash
# Initialize Firebase project
firebase init

# Select: Functions, Firestore, Storage, Hosting
# Choose your Firebase project
# Select JavaScript for functions
```

### **3. Environment Configuration**

สร้างไฟล์ `functions/.env`:

```env
# LINE Bot Configuration
CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
CHANNEL_SECRET=your_line_channel_secret

# Firebase Configuration  
GOOGLE_PROJECT_ID=your_firebase_project_id
GOOGLE_CLIENT_EMAIL=your_firebase_client_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# Government API Configuration
GOVERNMENT_API_KEY=your_government_api_key
CITIZEN_REGISTRY_URL=https://api.dopa.go.th/citizen
DISTRICT_API_URL=https://api.dopa.go.th/district

# Admin Configuration
ADMIN_TOKEN=your_secure_admin_token
ADMIN_SECRET_TOKEN=alternative_admin_token

# Notification Settings (Optional)
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=false
SMS_API_KEY=your_sms_api_key
EMAIL_API_KEY=your_email_api_key

# PromptPay Configuration
PROMPTPAY_ID=0858294254
```

### **4. LINE Developer Setup**

1. **สร้าง LINE Bot Channel:**
   - เข้า [LINE Developer Console](https://developers.line.biz/console/)
   - สร้าง Provider และ Messaging API Channel
   - คัดลอก Channel Access Token และ Channel Secret

2. **สร้าง LIFF App:**
   - ไปที่ LIFF Tab ในกลุ่ม Channel
   - สร้าง LIFF App ใหม่
   - Endpoint URL: `https://your-project.web.app/liff-register.html`
   - Scope: `profile openid`

3. **ตั้งค่า Webhook:**
   - Webhook URL: `https://us-central1-your-project.cloudfunctions.net/api/webhook`
   - เปิดใช้งาน Webhook

---

## 🚀 **Deployment**
### **1. Deploy Functions**

```bash
# Deploy all functions
firebase deploy --only functions

# หรือ Deploy เฉพาะ function
firebase deploy --only functions:api
```

### **2. Deploy Frontend**

```bash
# Deploy static files
firebase deploy --only hosting

# หรือ Deploy ทั้งหมด
firebase deploy
```

### **3. Verify Deployment**

```bash
# รันการตรวจสอบระบบ
cd functions
node production-check.js
```

```bash
# Deploy all functions
firebase deploy --only functions

# หรือ Deploy เฉพาะ function
firebase deploy --only functions:api
```

### **2. Deploy Frontend**

```bash
# Deploy static files
firebase deploy --only hosting

# หรือ Deploy ทั้งหมด
firebase deploy
```

### **3. Verify Deployment**

```bash
# รันการตรวจสอบระบบ
cd functions
node production-check.js
```

---

## 📱 **Usage Guide**

### **For Customers (LINE Bot)**

1. **เพิ่มเพื่อน LINE Bot**
2. **พิมพ์ "เมนู"** - ดูตัวเลือกการใช้งาน
3. **พิมพ์ "ลงทะเบียน"** - เริ่มกระบวนการสมัครสินเชื่อ
   - กรอกเลขบัตรประชาชน 13 หลัก
   - ระบบจะดึงข้อมูลจริงจากทะเบียนราษฎร
   - ตรวจสอบข้อมูลและยืนยันความถูกต้อง
   - เลือกจำนวนเงินกู้และความถี่การผ่อนชำระ
4. **พิมพ์ "สถานะ"** - ตรวจสอบสถานะการอนุมัติ
5. **พิมพ์ "อัปโหลดบัตร"** - ส่งรูปบัตรประชาชน

**🏛️ การยืนยันข้อมูลจากทะเบียนราษฎร:**
- ระบบจะตรวจสอบและดึงข้อมูลจริงจากกรมการปกครอง
- ตรวจสอบสถานะบัตรประชาชน (หมดอายุ, ยกเลิก, เสียชีวิต)
- เปรียบเทียบข้อมูลที่กรอกกับข้อมูลจริงจากราชการ
- ไม่ต้องกรอกชื่อ-นามสกุล เพราะระบบจะดึงจากทะเบียนราษฎร

### **For Admins (Web Dashboard)**

1. **เข้าสู่ระบบ:** `https://your-project.web.app/adminDashboard.html`
2. **ใส่ Admin Token** ที่กำหนดไว้ใน .env
3. **จัดการคำขอ:** อนุมัติ/ปฏิเสธ ใน Borrowers tab
4. **ตรวจสอบการชำระ:** ใน Payment Slips tab  
5. **ดูรายงาน:** สถิติและกราฟใน Dashboard

---

## 🔧 **API Endpoints**

### **Public Endpoints**
```
POST /webhook                          # LINE Bot webhook
POST /api/liff-register               # LIFF registration
```

### **Admin Endpoints (Require Authorization)**
```
GET  /api/admin/borrowers             # Get all borrowers
GET  /api/admin/slips                 # Get payment slips  
GET  /api/admin/images                # Get uploaded images
POST /api/admin/approve               # Approve/reject loans
POST /api/admin/generate-report       # Generate reports
POST /api/admin/credit-score          # Check credit score
POST /api/admin/blacklist             # Manage blacklist
```

### **Utility Endpoints**
```
POST /send-reminder                   # Send payment reminders
POST /check-due                       # Check due dates
```

---

## 📊 **Database Schema**

### **Collections**

#### **borrowers**
```javascript
{
  userId: "LINE_USER_ID",
  requestId: "req_xxxxx",
  
  // ข้อมูลส่วนตัวจากทะเบียนราษฎร
  titleName: "นาย",
  firstName: "สมชาย", // จากทะเบียนราษฎร
  lastName: "ใจดี", // จากทะเบียนราษฎร
  birthDate: "01/01/1999",
  idCard: "1120300144421",
  gender: "ชาย",
  nationality: "ไทย",
  religion: "พุทธ",
  
  // ที่อยู่
  address: "ที่อยู่ที่กรอก",
  officialAddress: "ที่อยู่จากทะเบียนราษฎร",
  addressDetails: {
    houseNumber: "123",
    village: "หมู่ 5",
    subDistrict: "ลาดยาว",
    district: "จตุจักร",
    province: "กรุงเทพมหานคร",
    postalCode: "10900"
  },
  
  // ข้อมูลสินเชื่อ
  amount: 5000,
  frequency: "monthly",
  loanTerms: {
    principal: 5000,
    interestRate: 0.10,
    totalWithInterest: 5500,
    installmentAmount: 458,
    dueDate: Timestamp
  },
  
  // ประเมินความเสี่ยง
  creditAssessment: {
    score: 720,
    grade: "A",
    riskLevel: "low"
  },
  creditHistory: {
    creditScore: 720,
    totalDebt: 150000,
    activeLoans: 2
  },
  
  // ข้อมูลบัตรประชาชน
  idCardStatus: "active",
  idCardIssueDate: "01/01/2020",
  idCardExpiryDate: "01/01/2030",
  
  // ข้อมูลระบบ
  dataSource: "government_registry",
  verificationTimestamp: "2024-01-01T00:00:00.000Z",
  status: "pending", // pending, approved, rejected
  paid: 0,
  createdAt: Timestamp,
  approvedAt: Timestamp
}
```

#### **slips**
```javascript
{
  userId: "LINE_USER_ID",
  date: "วันที่โอน",
  amount: 5500,
  createdAt: Timestamp,
  status: "pending" // pending, verified, rejected
}
```

#### **images**  
```javascript
{
  userId: "LINE_USER_ID",
  url: "https://storage.googleapis.com/...",
  createdAt: Timestamp
}
```

---

## 🧪 **Testing**

### **Unit Tests**
```bash
cd functions
npm test
```

### **System Health Check**
```bash
cd functions  
node production-check.js
```

### **Manual Testing**
1. **LINE Bot:** ทดสอบทุก command ใน LINE
2. **LIFF:** ทดสอบการลงทะเบียน
3. **Admin:** ทดสอบการ login และจัดการข้อมูล

---

## 🔒 **Security Considerations**

### **Environment Variables**
- เก็บ sensitive data ใน `.env` เท่านั้น
- ไม่ commit `.env` เข้า Git
- ใช้ Firebase Environment Config สำหรับ production

### **Authentication**
- Admin dashboard ใช้ Token-based authentication
- LINE webhook verification ด้วย signature
- Rate limiting สำหรับ API endpoints

### **Data Validation**
- Validate input ทุก endpoint
- Sanitize ข้อมูลก่อนเก็บ database
- ตรวจสอบ file type สำหรับการ upload

---

## 📈 **Performance Optimization**

### **Firebase Functions**
- ใช้ Connection pooling สำหรับ database
- Lazy loading สำหรับ modules
- Memory management สำหรับ large files

### **Frontend**
- CSS minification
- Image optimization
- Lazy loading สำหรับ components

### **Database**
- Proper indexing
- Query optimization
- Data pagination

---

## 🐛 **Troubleshooting**

### **Common Issues**

**1. LINE Bot ไม่ตอบ:**
```bash
# ตรวจสอบ webhook URL
firebase functions:log --only api

# ตรวจสอบ environment variables
cd functions && node -e "require('dotenv').config(); console.log(process.env.CHANNEL_ACCESS_TOKEN)"
```

**2. Admin Dashboard ไม่โหลด:**
```bash
# ตรวจสอบ CORS configuration
# ตรวจสอบ Admin Token
# ดู Browser Console สำหรับ errors
```

**3. LIFF ไม่ทำงาน:**
```bash
# ตรวจสอบ LIFF URL ใน LINE Developer Console
# ตรวจสอบ Endpoint URL
# ทดสอบใน LINE Browser
```

**4. File Upload ล้มเหลว:**
```bash
# ตรวจสอบ Storage Rules
# ตรวจสอบ file size limit
# ดู Functions logs
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Support**

- **Documentation:** [Wiki](https://github.com/your-username/BaanTK/wiki)
- **Issues:** [GitHub Issues](https://github.com/your-username/BaanTK/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/BaanTK/discussions)

---

## 🙏 **Acknowledgments**

- Firebase Team สำหรับ cloud platform ที่ยอดเยี่ยม
- LINE Developer Team สำหรับ Bot API และ LIFF
- Open Source Community สำหรับ libraries และ tools

---

**🎯 BaanTK - Making loan management simple and efficient**

![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red)
![Powered by Firebase](https://img.shields.io/badge/Powered%20by-Firebase-orange)
![Built for LINE](https://img.shields.io/badge/Built%20for-LINE-green)
