# 🔒 คำแนะนำด้านความปลอดภัย BaanTK

## ⚠️ ข้อมูลสำคัญที่ต้องระวัง

### 1. Environment Variables ที่จำเป็น
```bash
# LINE Bot Configuration
CHANNEL_ACCESS_TOKEN=your-actual-token
CHANNEL_SECRET=your-actual-secret

# Admin Authentication
ADMIN_SECRET_TOKEN=minimum-32-characters-random-string
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=strong-password-with-special-chars

# Firebase Configuration
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY="your-private-key"
```

### 2. การตั้งค่า Environment Variables

#### สำหรับ Firebase Functions:
```bash
# ตั้งค่าผ่าน Firebase CLI
firebase functions:config:set line.channel_access_token="your-token"
firebase functions:config:set line.channel_secret="your-secret"
firebase functions:config:set admin.secret_token="your-admin-token"

# หรือใช้ .env file ในโหมด development
cp functions/.env.example functions/.env
# แก้ไขค่าใน functions/.env
```

#### สำหรับ Local Development:
```bash
# สร้างไฟล์ .env ในโฟลเดอร์ functions/
cd functions
cp .env.example .env
# แก้ไขค่าจริงในไฟล์ .env
```

### 3. ข้อควรระวัง

#### ❌ สิ่งที่ห้ามทำ:
- ห้ามเขียนข้อมูลลับลงในโค้ดโดยตรง
- ห้าม commit ไฟล์ .env ขึ้น Git
- ห้ามแชร์ token หรือ secret ผ่าน chat/email
- ห้ามใช้รหัสผ่านง่ายๆ เช่น "admin123"

#### ✅ สิ่งที่ควรทำ:
- ใช้ environment variables เสมอ
- ใช้รหัสผ่านที่แข็งแกร่ง (อย่างน้อย 12 ตัวอักษร)
- เปลี่ยนรหัสผ่านเป็นประจำ
- ตรวจสอบ .gitignore ให้มี .env

### 4. การสร้าง Admin Token ที่ปลอดภัย

```bash
# ใช้ Node.js สร้าง random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# หรือใช้ OpenSSL
openssl rand -hex 32
```

### 5. การตรวจสอบความปลอดภัย

#### ตรวจสอบก่อน Deploy:
```bash
# ตรวจสอบว่าไม่มีข้อมูลลับในโค้ด
grep -r "htsHzjHcSkA1Xu3Qtf7C" functions/
grep -r "87fe8316138c02b02a4e20dafde563fd" functions/
grep -r "admin123" functions/

# ตรวจสอบ environment variables
firebase functions:config:get
```

### 6. การจัดการ CORS

- ในโหมด production จะปฏิเสธ origin ที่ไม่ได้รับอนุญาต
- ในโหมด development จะแสดง warning แต่ยังอนุญาต
- ตั้งค่า NODE_ENV=production เมื่อ deploy จริง

### 7. การ Monitor ความปลอดภัย

#### ตรวจสอบ Log เป็นประจำ:
```bash
# ดู Firebase Functions logs
firebase functions:log

# ค้นหาการพยายามเข้าถึงที่ผิดปกติ
firebase functions:log | grep "Invalid admin token"
firebase functions:log | grep "CORS: Origin blocked"
```

### 8. การแจ้งเตือนเมื่อมีปัญหา

ระบบจะ log เหตุการณ์ต่อไปนี้:
- การพยายามใช้ admin token ที่ผิด
- การเข้าถึงจาก origin ที่ไม่ได้รับอนุญาต
- การขาด environment variables ที่จำเป็น

### 9. Checklist ก่อน Deploy

- [ ] ตรวจสอบว่าไม่มีข้อมูลลับในโค้ด
- [ ] ตั้งค่า environment variables ครบถ้วน
- [ ] ทดสอบการยืนยันตัวตน admin
- [ ] ตรวจสอบ CORS configuration
- [ ] ตั้งค่า NODE_ENV=production
- [ ] ทดสอบ LINE Bot integration

### 10. การติดต่อเมื่อมีปัญหา

หากพบปัญหาด้านความปลอดภัย:
1. หยุดใช้งานระบบทันที
2. เปลี่ยนรหัสผ่านและ token ทั้งหมด
3. ตรวจสอบ log เพื่อหาสาเหตุ
4. แจ้งทีมพัฒนาทันที

---

**หมายเหตุ**: เอกสารนี้มีข้อมูลสำคัญด้านความปลอดภัย กรุณาเก็บรักษาเป็นความลับ