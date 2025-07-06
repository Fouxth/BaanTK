// statusFlex.js
exports.approvedFlex = (name, amount) => ({
  type: "flex",
  altText: "อนุมัติแล้ว",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "🎉 สินเชื่อผ่านแล้ว!", weight: "bold", size: "xl", color: "#28a745" },
        { type: "text", text: `ชื่อ: ${name}`, margin: "md" },
        { type: "text", text: `วงเงิน: ${amount.toLocaleString()} บาท`, color: "#333", margin: "sm" },
        { type: "separator", margin: "md" },
        { type: "text", text: "กดเพื่อดูวิธีชำระ", margin: "lg", size: "sm", color: "#999" }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "message",
            label: "ครบกำหนด",
            text: "ครบกำหนด"
          },
          style: "primary",
          color: "#28a745"
        }
      ]
    }
  }
});

exports.dueReminderFlex = (dueDate, qrImageUrl) => ({
  type: "flex",
  altText: "แจ้งเตือนวันครบกำหนด",
  contents: {
    type: "bubble",
    hero: {
      type: "image",
      url: qrImageUrl,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "🔔 แจ้งเตือนวันครบกำหนด", weight: "bold", size: "lg", color: "#d9534f" },
        { type: "text", text: `กรุณาชำระภายใน ${dueDate}`, margin: "md", wrap: true },
        { type: "text", text: "สแกน QR เพื่อชำระ", size: "sm", color: "#999", margin: "md" }
      ]
    }
  }
});

exports.paymentSlipReceivedFlex = () => ({
  type: "flex",
  altText: "ระบบได้รับสลิปแล้ว",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "📸 ได้รับสลิปแล้ว", weight: "bold", size: "lg", color: "#007bff" },
        { type: "text", text: "กำลังตรวจสอบข้อมูล กรุณารอเจ้าหน้าที่ติดต่อกลับ", wrap: true, margin: "md", size: "sm" }
      ]
    }
  }
});
