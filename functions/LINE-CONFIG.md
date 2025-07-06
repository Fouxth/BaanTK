# BaanTK LINE Bot Configuration Guide
# 
# สำหรับการตั้งค่า LINE Bot ให้ใช้คำสั่งต่อไปนี้:
# 
# 1. ตั้งค่า Channel Access Token:
# firebase functions:config:set line.channel_access_token="YOUR_ACTUAL_CHANNEL_ACCESS_TOKEN"
# 
# 2. ตั้งค่า Channel Secret:
# firebase functions:config:set line.channel_secret="YOUR_ACTUAL_CHANNEL_SECRET"
# 
# 3. ตรวจสอบการตั้งค่า:
# firebase functions:config:get
# 
# 4. Deploy functions:
# firebase deploy --only functions
# 
# สำหรับการทดสอบ local:
# - สร้างไฟล์ .env ใน functions/ directory
# - เพิ่มตัวแปรต่อไปนี้:
#   LINE_CHANNEL_ACCESS_TOKEN=your_token_here
#   LINE_CHANNEL_SECRET=your_secret_here
# 
# การรับ LINE Bot credentials:
# 1. ไปที่ https://developers.line.biz/
# 2. สร้าง Provider และ Channel ใหม่ (หรือใช้ที่มีอยู่)
# 3. คัดลอก Channel Access Token และ Channel Secret
# 4. ตั้งค่า Webhook URL เป็น: https://your-project.web.app/webhook
# 
# ตัวอย่าง Webhook URL สำหรับ BaanTK:
# https://baan-tk.web.app/webhook

# Default values (replace with actual tokens)
LINE_CHANNEL_ACCESS_TOKEN=YOUR_CHANNEL_ACCESS_TOKEN_HERE
LINE_CHANNEL_SECRET=YOUR_CHANNEL_SECRET_HERE

# Firebase Functions Environment Configuration
# Use these commands to set the actual values:
#
# firebase functions:config:set \
#   line.channel_access_token="YOUR_ACTUAL_TOKEN" \
#   line.channel_secret="YOUR_ACTUAL_SECRET" \
#   app.admin_token="BaanTK@Admin#2024$Secure!"
#
# firebase deploy --only functions
