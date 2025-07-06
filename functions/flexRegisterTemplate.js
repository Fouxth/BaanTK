// registerFlex.js
module.exports = {
  type: "bubble",
  hero: {
    type: "image",
    url: "https://cdn.discordapp.com/attachments/1109913143683076097/1377030013747990628/baan-tk.png",
    size: "full",
    aspectMode: "cover",
    aspectRatio: "16:9"
  },
  body: {
    type: "box",
    layout: "vertical",
    spacing: "md",
    contents: [
      {
        type: "text",
        text: "📝 ลงทะเบียนผู้กู้เงิน",
        weight: "bold",
        size: "lg",
        align: "center"
      },
      {
        type: "text",
        text: "กรุณากดปุ่มด้านล่างเพื่อกรอกข้อมูลลงทะเบียน",
        wrap: true,
        size: "sm",
        align: "center",
        color: "#888888"
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
          type: "uri",
          label: "📄 กรอกแบบฟอร์ม",
          uri: "https://liff.line.me/2007493964-gWv9bxBR" // 🔧 เปลี่ยนเป็น LIFF URL จริงของน้อง
        }
      }
    ]
  },
  altText: "ลงทะเบียนผู้กู้"
};
