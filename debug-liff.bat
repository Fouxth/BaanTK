@echo off
echo 🔍 กำลังตรวจสอบปัญหาแบบฟอร์ม LIFF...
echo.

echo ========================================
echo 📋 1. ตรวจสอบ Firebase Functions status
echo ========================================
firebase functions:list
echo.

echo ========================================
echo 📋 2. ตรวจสอบ Logs ล่าสุด 
echo ========================================
firebase functions:log --limit=20
echo.

echo ========================================
echo 📋 3. ตรวจสอบ Firebase Hosting
echo ========================================
firebase hosting:sites:list
echo.

echo ========================================
echo 📋 4. ตรวจสอบ CORS และ API endpoint
echo ========================================
curl -X POST "https://webhook-kkrrpg5icq-uc.a.run.app/api/liff-register" ^
  -H "Content-Type: application/json" ^
  -d "{\"test\":\"data\"}" ^
  -w "HTTP Status: %%{http_code}\n"
echo.

echo ========================================
echo 📋 5. แนะนำการแก้ไข
echo ========================================
echo 🔧 ปัญหาที่พบบ่อย:
echo    1. LIFF ID ไม่ถูกต้อง
echo    2. Backend URL ไม่ถูกต้อง  
echo    3. CORS ปิดกั้นการเชื่อมต่อ
echo    4. Validation middleware บล็อคข้อมูล
echo    5. Functions ไม่ได้ deploy
echo.
echo 💡 แนะนำ: เปิด Browser DevTools (F12) ดู Console errors
echo    หรือเปิด Network tab ดู HTTP requests
echo.

pause
