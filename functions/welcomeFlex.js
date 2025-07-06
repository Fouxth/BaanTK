// welcomeFlex.js - ใช้เมื่อผู้ใช้ Add LINE Bot ใหม่ หรือเริ่มต้นใช้งาน
module.exports = {
  type: "flex",
  altText: "ยินดีต้อนรับสู่ Baan-TK!",
  contents: {
    type: "bubble",
    size: "giga",
    hero: {
      type: "image",
      url: "https://cdn.discordapp.com/attachments/1109913143683076097/1377030013747990628/baan-tk.png?ex=68377aa3&is=68362923&hm=2981ac2c1b7bee9c2bc6e0785335113b5ba6834f42233982b66a8672fd1c32b2&",
      size: "full",
      aspectRatio: "16:9",
      aspectMode: "cover"
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "ยินดีต้อนรับเข้าสู่ระบบกู้เงิน Baan-TK",
          weight: "bold",
          size: "lg",
          align: "center",
          wrap: true
        },
        {
          type: "text",
          text: "📌 ระบบของเราช่วยให้คุณ:\n- สมัครกู้เงิน\n- ตรวจสอบสถานะ\n- แจ้งการชำระเงิน\n- อัปโหลดเอกสาร\nทั้งหมดผ่านเมนูง่ายๆ",
          size: "sm",
          color: "#666666",
          wrap: true
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#1DB446",
          action: {
            type: "message",
            label: "📋 เปิดเมนูหลัก",
            text: "เมนู"
          }
        }
      ]
    }
  }
};
