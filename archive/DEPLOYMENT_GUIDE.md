# 🚀 คู่มือ Deploy ระบบ LINE Bot Enhanced

## ก่อน Deploy

### 1. ตรวจสอบ Firebase Configuration
```bash
# ตรวจสอบ Firebase project
firebase projects:list

# ตรวจสอบ Firebase config
firebase functions:config:get
```

### 2. ตรวจสอบ LINE Channel Settings
- LINE Channel Access Token
- LINE Channel Secret  
- Webhook URL: `https://your-project.cloudfunctions.net/lineWebhook`

### 3. ตรวจสอบ Firestore Security Rules
```bash
firebase firestore:rules:get
```

## Deploy Commands

### Deploy Functions เท่านั้น
```bash
cd /Users/pn/Desktop/Fouxth/BaanTK
firebase deploy --only functions
```

### Deploy ทั้งหมด (Functions + Firestore + Storage)
```bash
cd /Users/pn/Desktop/Fouxth/BaanTK
firebase deploy
```

### Deploy แบบ Force Update
```bash
firebase deploy --only functions --force
```

## ตรวจสอบหลัง Deploy

### 1. ทดสอบ Webhook
```bash
# ดู Logs
firebase functions:log

# ทดสอบ LINE Message
# ส่งข้อความไปที่ LINE Bot
```

### 2. ทดสอบฟีเจอร์ใหม่
- ✅ กดปุ่ม "ตรวจสอบสถานะ"
- ✅ ส่งเลขบัตรประชาชน 13 หลัก
- ✅ อัปโหลดรูปสลีป
- ✅ ตรวจสอบการแจ้งเตือนอัตโนมัติ

### 3. Monitor Performance
```bash
# ดู Function logs
firebase functions:log --only lineWebhook

# ดู Function usage
firebase functions:shell
```

## Troubleshooting

### หาก Deploy ไม่สำเร็จ
```bash
# ลบ Functions cache
rm -rf functions/node_modules
cd functions && npm install

# Deploy ใหม่
firebase deploy --only functions
```

### หาก LINE Bot ไม่ตอบ
1. ตรวจสอบ Webhook URL ใน LINE Console
2. ตรวจสอบ Access Token
3. ดู Functions Logs

### หากรูปภาพอัปโหลดไม่ได้
1. ตรวจสอบ Storage Rules
2. ตรวจสอบ CORS Settings
3. ตรวจสอบ File Size Limits

## Production Checklist

- [ ] Firebase Project ID ถูกต้อง
- [ ] LINE Channel Token อัปเดต
- [ ] Webhook URL ถูกต้อง  
- [ ] Firestore Rules อัปเดต
- [ ] Storage Rules อัปเดต
- [ ] Environment Variables ครบถ้วน
- [ ] Domain Whitelist ถูกต้อง
- [ ] SSL Certificate ใช้งานได้

## Next Steps

หลัง Deploy สำเร็จ:
1. ทดสอบกับผู้ใช้จริง
2. Monitor การใช้งานและ Performance
3. ปรับปรุงและเพิ่มฟีเจอร์ใหม่
4. Backup ข้อมูลสำคัญ
