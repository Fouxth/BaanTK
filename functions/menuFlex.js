// menuFlex.js - เมนูหลักสำหรับระบบกู้เงิน Baan-TK
module.exports = {
  type: "carousel",
  contents: [
    {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://i.imgur.com/EmlA7FP.png",
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📋 สมัครกู้เงิน 5,000 บาท",
            weight: "bold",
            size: "lg",
            wrap: true
          },
          {
            type: "text",
            text: "สมัครง่าย อนุมัติไว",
            size: "sm",
            color: "#999999"
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
              label: "เริ่มลงทะเบียน",
              text: "ลงทะเบียน"
            }
          },
          {
            type: "button",
            style: "link",
            action: {
              type: "uri",
              label: "ดูเงื่อนไขทั้งหมด",
              uri: "https://www.youtube.com/watch?v=5x5JxMbdzrk"
            }
          }
        ]
      }
    },
    {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://i.imgur.com/KcOxx2V.png",
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📑 ตรวจสอบสถานะ",
            weight: "bold",
            size: "lg"
          },
          {
            type: "text",
            text: "ดูผลอนุมัติ, วงเงิน, ประวัติ",
            size: "sm",
            color: "#999999"
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
            color: "#4B7BEC",
            action: {
              type: "message",
              label: "ตรวจสอบสถานะ",
              text: "สถานะ"
            }
          }
        ]
      }
    },
    {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://i.imgur.com/A26C8SJ.png",
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "💰 การชำระเงิน",
            weight: "bold",
            size: "lg"
          },
          {
            type: "text",
            text: "ดูยอดค้างชำระ, ประวัติการชำระ",
            size: "sm",
            color: "#999999"
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
            color: "#FF6B35",
            action: {
              type: "message",
              label: "ดูการชำระเงิน",
              text: "ชำระเงิน"
            }
          }
        ]
      }
    }
  ],
  altText: "เมนูหลัก"
};
