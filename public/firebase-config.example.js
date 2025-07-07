// Firebase Configuration Template
// คัดลอกไฟล์นี้เป็น firebase-config.js และใส่ค่าที่ถูกต้องจาก Firebase Console

export const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com", 
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// วิธีหาค่าเหล่านี้:
// 1. ไปที่ Firebase Console (https://console.firebase.google.com/)
// 2. เลือก Project ของคุณ
// 3. ไปที่ Project Settings (ไอคอนเฟือง)
// 4. เลื่อนลงมาหา "Your apps" section
// 5. เลือก Web app หรือสร้างใหม่ถ้ายังไม่มี
// 6. คัดลอกค่า Config object
