// 🤖 LINE Auto-Reply Service for BaanTK
const { Client } = require("@line/bot-sdk");
const admin = require("firebase-admin");

// โหลด environment variables สำหรับ local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// LINE Bot Configuration
const LINE_CONFIG = {
  channelAccessToken: 
    process.env.LINE_CHANNEL_ACCESS_TOKEN || 
    process.env.CHANNEL_ACCESS_TOKEN ||
    "dummy-token-for-testing",
  channelSecret: 
    process.env.LINE_CHANNEL_SECRET || 
    process.env.CHANNEL_SECRET ||
    "dummy-secret-for-testing"
};

// ตรวจสอบว่ามีการตั้งค่าครบถ้วน (เฉพาะใน production)
if (process.env.NODE_ENV === 'production' && 
    (!LINE_CONFIG.channelAccessToken || !LINE_CONFIG.channelSecret ||
     LINE_CONFIG.channelAccessToken === "dummy-token-for-testing" ||
     LINE_CONFIG.channelSecret === "dummy-secret-for-testing")) {
  console.error("❌ LINE configuration missing! Please set environment variables:");
  console.error("- LINE_CHANNEL_ACCESS_TOKEN or CHANNEL_ACCESS_TOKEN");
  console.error("- LINE_CHANNEL_SECRET or CHANNEL_SECRET");
  throw new Error("LINE configuration is required in production");
}

console.log("🔧 LINE Config loaded:", {
  hasAccessToken: !!LINE_CONFIG.channelAccessToken,
  hasSecret: !!LINE_CONFIG.channelSecret,
  tokenLength: LINE_CONFIG.channelAccessToken?.length || 0
});

const lineClient = new Client(LINE_CONFIG);

// Initialize Firebase if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ตัวแปรเก็บสถานะของผู้ใช้งาน (สำหรับ multi-step conversation)
const userStates = new Map();

// Auto-reply messages - Enhanced with Flex Messages
const AUTO_REPLIES = {
  welcome: {
    type: "flex",
    altText: "ยินดีต้อนรับสู่ BaanTK!",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://cdn.discordapp.com/attachments/1109913143683076097/1391796924113354842/baan-tk2.jpg?ex=686d3365&is=686be1e5&hm=47f3cdc26841581ff25ca6ae3b00cdfd059cfaeaf87b154a7d97007084d72ac3&",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "ยินดีต้อนรับสู่ BaanTK! 🏠",
            weight: "bold",
            size: "xl",
            color: "#1DB446"
          },
          {
            type: "text",
            text: "ขอบคุณที่เพิ่มเราเป็นเพื่อน",
            size: "md",
            color: "#666666",
            margin: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "📋 บริการสินเชื่อด่วน ปลอดภัย เชื่อถือได้",
                size: "sm",
                color: "#333333"
              },
              {
                type: "text",
                text: "• วงเงิน 1,000-50,000 บาท",
                size: "sm",
                color: "#666666"
              },
              {
                type: "text",
                text: "• ขั้นตอนง่าย อนุมัติเร็ว",
                size: "sm",
                color: "#666666"
              }
            ]
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
            height: "sm",
            action: {
              type: "postback",
              label: "สมัครสินเชื่อ",
              data: "action=register"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "ดูบริการทั้งหมด",
              data: "action=menu"
            }
          }
        ]
      }
    }
  },

  mainMenu: {
    type: "flex",
    altText: "เมนูบริการ BaanTK",
    contents: {
      type: "carousel",
      contents: [
        {
          type: "bubble",
          hero: {
            type: "image",
            url: "https://via.placeholder.com/1040x585/1DB446/FFFFFF?text=📝+สมัครสินเชื่อ",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📝 สมัครสินเชื่อ",
                weight: "bold",
                size: "lg",
                color: "#1DB446"
              },
              {
                type: "text",
                text: "สมัครง่าย อนุมัติเร็ว วงเงิน 1,000-50,000 บาท",
                size: "sm",
                color: "#666666",
                margin: "md",
                wrap: true
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "uri",
                  label: "สมัครเลย",
                  uri: "https://baan-tk.web.app/liff-register.html"
                }
              }
            ]
          }
        },
        {
          type: "bubble",
          hero: {
            type: "image",
            url: "https://via.placeholder.com/1040x585/FF6B35/FFFFFF?text=🔍+ตรวจสอบสถานะ",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🔍 ตรวจสอบสถานะ",
                weight: "bold",
                size: "lg",
                color: "#FF6B35"
              },
              {
                type: "text",
                text: "ตรวจสอบสถานะการสมัครและขั้นตอนอนุมัติ",
                size: "sm",
                color: "#666666",
                margin: "md",
                wrap: true
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "ตรวจสอบ",
                  data: "action=check_status"
                }
              }
            ]
          }
        },
        {
          type: "bubble",
          hero: {
            type: "image",
            url: "https://via.placeholder.com/1040x585/4ECDC4/FFFFFF?text=💰+ชำระเงิน",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "💰 ชำระเงิน",
                weight: "bold",
                size: "lg",
                color: "#4ECDC4"
              },
              {
                type: "text",
                text: "ส่งหลักฐานการชำระและดูประวัติการชำระ",
                size: "sm",
                color: "#666666",
                margin: "md",
                wrap: true
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "ส่งสลิป",
                  data: "action=payment"
                }
              }
            ]
          }
        },
        {
          type: "bubble",
          hero: {
            type: "image",
            url: "https://via.placeholder.com/1040x585/9B59B6/FFFFFF?text=📋+เงื่อนไขบริการ",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📋 เงื่อนไขบริการ",
                weight: "bold",
                size: "lg",
                color: "#9B59B6"
              },
              {
                type: "text",
                text: "ดูเงื่อนไข ดอกเบี้ย และข้อกำหนดการให้บริการ",
                size: "sm",
                color: "#666666",
                margin: "md",
                wrap: true
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "ดูเงื่อนไข",
                  data: "action=terms"
                }
              }
            ]
          }
        },
        {
          type: "bubble",
          hero: {
            type: "image",
            url: "https://via.placeholder.com/1040x585/E67E22/FFFFFF?text=📞+ติดต่อเจ้าหน้าที่",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📞 ติดต่อเจ้าหน้าที่",
                weight: "bold",
                size: "lg",
                color: "#E67E22"
              },
              {
                type: "text",
                text: "โทร LINE Email หรือติดต่อแอดมิน",
                size: "sm",
                color: "#666666",
                margin: "md",
                wrap: true
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "ติดต่อ",
                  data: "action=contact"
                }
              }
            ]
          }
        },
        {
          type: "bubble",
          hero: {
            type: "image",
            url: "https://via.placeholder.com/1040x585/3498DB/FFFFFF?text=🏠+เกี่ยวกับเรา",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🏠 เกี่ยวกับ BaanTK",
                weight: "bold",
                size: "lg",
                color: "#3498DB"
              },
              {
                type: "text",
                text: "ข้อมูลบริษัท ประวัติการให้บริการ และข่าวสาร",
                size: "sm",
                color: "#666666",
                margin: "md",
                wrap: true
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "เกี่ยวกับเรา",
                  data: "action=about"
                }
              }
            ]
          }
        }
      ]
    }
  },

  register: {
    type: "flex",
    altText: "การสมัครสินเชื่อ BaanTK",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📝 การสมัครสินเชื่อ BaanTK",
            weight: "bold",
            size: "xl",
            color: "#1DB446"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "💡 เอกสารที่ต้องเตรียม:",
                weight: "bold",
                size: "md",
                color: "#333333"
              },
              {
                type: "text",
                text: "• บัตรประชาชน",
                size: "sm",
                color: "#666666"
              },
              {
                type: "text",
                text: "• หลักฐานที่อยู่",
                size: "sm",
                color: "#666666"
              },
              {
                type: "text",
                text: "• หลักฐานรายได้",
                size: "sm",
                color: "#666666"
              }
            ]
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
            height: "sm",
            action: {
              type: "uri",
              label: "เริ่มสมัครเลย",
              uri: "https://baan-tk.web.app/liff-register.html"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "กลับเมนู",
              data: "action=menu"
            }
          }
        ]
      }
    }
  },

  contact: {
    type: "flex",
    altText: "ติดต่อเจ้าหน้าที่ BaanTK",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📞 ติดต่อเจ้าหน้าที่",
            weight: "bold",
            size: "xl",
            color: "#FF6B35"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "โทร:",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: "02-123-4567",
                    wrap: true,
                    color: "#1DB446",
                    size: "sm",
                    flex: 3
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "LINE:",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: "@baantk",
                    wrap: true,
                    color: "#1DB446",
                    size: "sm",
                    flex: 3
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "Email:",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: "info@baantk.com",
                    wrap: true,
                    color: "#1DB446",
                    size: "sm",
                    flex: 3
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "เวลา:",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 1
                  },
                  {
                    type: "text",
                    text: "จันทร์-ศุกร์ 8:00-17:00",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 3
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "uri",
              label: "โทรเลย",
              uri: "tel:021234567"
            }
          }
        ]
      }
    }
  },

  terms: {
    type: "flex",
    altText: "เงื่อนไขการให้บริการ BaanTK",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📋 เงื่อนไขการให้บริการ",
            weight: "bold",
            size: "xl",
            color: "#9B59B6",
            align: "center"
          }
        ],
        paddingBottom: "md"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🔸",
                    color: "#9B59B6",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "อายุ 20-65 ปี มีรายได้ประจำ",
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🔸",
                    color: "#9B59B6",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "วงเงิน 1,000-50,000 บาท",
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🔸",
                    color: "#9B59B6",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "ดอกเบี้ย 10-20% ต่อเดือน",
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🔸",
                    color: "#9B59B6",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "ระยะเวลาผ่อน 1-12 เดือน",
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🔸",
                    color: "#9B59B6",
                    size: "sm",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: "ไม่มีค่าธรรมเนียมแอบแฝง",
                    wrap: true,
                    color: "#333333",
                    size: "sm",
                    flex: 1
                  }
                ]
              }
            ]
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
            height: "sm",
            action: {
              type: "postback",
              label: "สมัครเลย",
              data: "action=register"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "กลับเมนู",
              data: "action=menu"
            }
          }
        ]
      }
    }
  },

  about: {
    type: "flex",
    altText: "เกี่ยวกับ BaanTK",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://baan-tk.web.app/baan-tk.png",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🏠 BaanTK",
            weight: "bold",
            size: "xl",
            color: "#3498DB"
          },
          {
            type: "text",
            text: "ผู้ให้บริการสินเชื่อด่วนที่เชื่อถือได้",
            size: "md",
            color: "#666666",
            margin: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "✨ จุดเด่นของเรา:",
                weight: "bold",
                size: "md",
                color: "#3498DB"
              },
              {
                type: "text",
                text: "• ประสบการณ์กว่า 10 ปี",
                size: "sm",
                color: "#666666"
              },
              {
                type: "text",
                text: "• อนุมัติเร็ว ภายใน 24 ชั่วโมง",
                size: "sm",
                color: "#666666"
              },
              {
                type: "text",
                text: "• ให้บริการ 24/7",
                size: "sm",
                color: "#666666"
              },
              {
                type: "text",
                text: "• ปลอดภัย มีใบอนุญาต",
                size: "sm",
                color: "#666666"
              }
            ]
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
            height: "sm",
            action: {
              type: "uri",
              label: "เยี่ยมชมเว็บไซต์",
              uri: "https://baan-tk.web.app"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "กลับเมนู",
              data: "action=menu"
            }
          }
        ]
      }
    }
  },

  status: {
    type: "flex",
    altText: "ตรวจสอบสถานะการสมัคร BaanTK",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🔍 ตรวจสอบสถานะการสมัคร",
            weight: "bold",
            size: "xl",
            color: "#FF6B35"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "md",
            contents: [
              {
                type: "text",
                text: "💡 วิธีตรวจสอบสถานะ:",
                weight: "bold",
                size: "md",
                color: "#333333"
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "1.",
                    color: "#FF6B35",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "ส่งเลขบัตรประชาชน 13 หลัก",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "2.",
                    color: "#FF6B35",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "รอผลการตรวจสอบจากระบบ",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "3.",
                    color: "#FF6B35",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "ติดต่อเจ้าหน้าที่หากมีข้อสงสัย",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              }
            ]
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
            height: "sm",
            action: {
              type: "postback",
              label: "ติดต่อเจ้าหน้าที่",
              data: "action=contact"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "กลับเมนู",
              data: "action=menu"
            }
          }
        ]
      }
    }
  },

  payment: {
    type: "flex",
    altText: "ส่งหลักฐานการชำระเงิน BaanTK",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "💰 ส่งหลักฐานการชำระเงิน",
            weight: "bold",
            size: "xl",
            color: "#4ECDC4"
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "md",
            contents: [
              {
                type: "text",
                text: "📸 ข้อมูลที่ต้องส่ง:",
                weight: "bold",
                size: "md",
                color: "#333333"
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "✓",
                    color: "#4ECDC4",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "รูปภาพสลิปการโอนเงิน",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "✓",
                    color: "#4ECDC4",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "ยอดเงินที่โอน",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "✓",
                    color: "#4ECDC4",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "วันที่และเวลาที่ชำระ",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "✓",
                    color: "#4ECDC4",
                    size: "sm",
                    flex: 0,
                    weight: "bold"
                  },
                  {
                    type: "text",
                    text: "เลขที่สัญญา (ถ้ามี)",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 1
                  }
                ]
              }
            ]
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
            height: "sm",
            action: {
              type: "postback",
              label: "ติดต่อเจ้าหน้าที่",
              data: "action=contact"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "กลับเมนู",
              data: "action=menu"
            }
          }
        ]
      }
    }
  },

  // Simple text replies for compatibility  
  greeting: [
    "สวัสดีครับ! ยินดีต้อนรับสู่ BaanTK 🏠",
    "พวกเราพร้อมช่วยเหลือคุณในเรื่องสินเชื่อด่วน",
    "กดเมนูเพื่อดูบริการต่างๆ หรือพิมพ์ 'ช่วยเหลือ' เพื่อดูคำสั่งทั้งหมด"
  ],
  
  default: [
    "ขออภัยครับ ไม่เข้าใจคำสั่งของคุณ 😅",
    "กรุณาใช้เมนูด้านล่าง หรือพิมพ์ 'เมนู' เพื่อดูตัวเลือกทั้งหมด"
  ]
};

// Rich Menu Configuration
const RICH_MENU_CONFIG = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: false,
  name: "BaanTK Main Menu",
  chatBarText: "เมนู",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: "postback", data: "action=register" }
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: { type: "postback", data: "action=check_status" }
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: { type: "postback", data: "action=payment" }
    },
    {
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: { type: "postback", data: "action=contact" }
    },
    {
      bounds: { x: 833, y: 843, width: 834, height: 843 },
      action: { type: "postback", data: "action=terms" }
    },
    {
      bounds: { x: 1667, y: 843, width: 833, height: 843 },
      action: { type: "postback", data: "action=about" }
    }
  ]
};

// Function to create Rich Menu
async function createRichMenu() {
  try {
    // Create rich menu
    const richMenu = await lineClient.createRichMenu(RICH_MENU_CONFIG);
    console.log(`✅ Rich Menu created with ID: ${richMenu.richMenuId}`);
    
    // Note: You need to upload an image for the rich menu
    // This should be done via LINE Developers Console or API
    // The image should be 2500x1686 pixels
    
    return richMenu.richMenuId;
  } catch (error) {
    console.error("❌ Failed to create Rich Menu:", error);
    return null;
  }
}

// Function to set Rich Menu as default
async function setDefaultRichMenu(richMenuId) {
  try {
    await lineClient.setDefaultRichMenu(richMenuId);
    console.log(`✅ Set Rich Menu ${richMenuId} as default`);
    return true;
  } catch (error) {
    console.error("❌ Failed to set default Rich Menu:", error);
    return false;
  }
}

// ฟังก์ชันสำหรับส่งการแจ้งเตือนเมื่อแอดมินอนุมัติสลีป
async function sendSlipApprovalNotification(userId, slipData, approvalStatus) {
  try {
    let message;
    
    if (approvalStatus === 'approved') {
      message = {
        type: "flex",
        altText: "สลีปการชำระเงินได้รับการอนุมัติ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "✅ สลีปได้รับการอนุมัติ",
                weight: "bold",
                size: "lg",
                color: "#1DB446"
              },
              {
                type: "separator",
                margin: "md"
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🎉 ยินดีด้วย! สลีปการชำระเงินของคุณได้รับการอนุมัติแล้ว",
                    wrap: true,
                    color: "#333333",
                    size: "md"
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    margin: "lg",
                    contents: [
                      {
                        type: "text",
                        text: "💰 ยอดชำระ:",
                        color: "#666666",
                        size: "sm",
                        flex: 2
                      },
                      {
                        type: "text",
                        text: `${slipData.amount || 'ไม่ระบุ'} บาท`,
                        color: "#1DB446",
                        size: "sm",
                        flex: 3,
                        weight: "bold"
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "📅 วันที่อนุมัติ:",
                        color: "#666666",
                        size: "sm",
                        flex: 2
                      },
                      {
                        type: "text",
                        text: new Date().toLocaleDateString('th-TH'),
                        color: "#333333",
                        size: "sm",
                        flex: 3
                      }
                    ]
                  }
                ]
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
                height: "sm",
                action: {
                  type: "postback",
                  label: "ดูสถานะการชำระ",
                  data: "action=check_status"
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "กลับเมนู",
                  data: "action=menu"
                }
              }
            ]
          }
        }
      };
    } else {
      message = {
        type: "flex",
        altText: "สลีปการชำระเงินไม่ได้รับการอนุมัติ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "❌ สลีปไม่ได้รับการอนุมัติ",
                weight: "bold",
                size: "lg",
                color: "#E74C3C"
              },
              {
                type: "separator",
                margin: "md"
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "เสียใจด้วย สลีปการชำระเงินของคุณไม่ได้รับการอนุมัติ",
                    wrap: true,
                    color: "#333333",
                    size: "md"
                  },
                  {
                    type: "text",
                    text: "💡 เหตุผลที่เป็นไปได้:",
                    weight: "bold",
                    color: "#E74C3C",
                    size: "sm",
                    margin: "lg"
                  },
                  {
                    type: "text",
                    text: "• ข้อมูลในสลีปไม่ชัดเจน\n• ยอดเงินไม่ตรงกับที่ต้องชำระ\n• รูปภาพไม่สมบูรณ์",
                    wrap: true,
                    color: "#666666",
                    size: "sm"
                  }
                ]
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
                height: "sm",
                action: {
                  type: "postback",
                  label: "ส่งสลีปใหม่",
                  data: "action=payment"
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "ติดต่อเจ้าหน้าที่",
                  data: "action=contact"
                }
              }
            ]
          }
        }
      };
    }

    await lineClient.pushMessage(userId, message);
    console.log(`✅ Sent slip ${approvalStatus} notification to user ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Failed to send slip ${approvalStatus} notification:`, error);
    return { success: false, error: error.message };
  }
}

// ฟังก์ชันสำหรับส่งการแจ้งเตือนเมื่อแอดมินอนุมัติ/ปฏิเสธการสมัคร
async function sendApplicationStatusNotification(userId, borrowerData, approvalStatus) {
  try {
    let message;
    
    if (approvalStatus === 'approved') {
      const interestRate = borrowerData.interestRate || 0.1;
      const totalDue = borrowerData.totalLoan + (borrowerData.totalLoan * interestRate);
      
      message = {
        type: "flex",
        altText: "คำขอสินเชื่อได้รับการอนุมัติ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎉 คำขอได้รับการอนุมัติ!",
                weight: "bold",
                size: "lg",
                color: "#1DB446"
              },
              {
                type: "separator",
                margin: "md"
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: `ยินดีด้วย คุณ${borrowerData.firstName} ${borrowerData.lastName}`,
                    weight: "bold",
                    color: "#333333",
                    size: "md"
                  },
                  {
                    type: "text",
                    text: "คำขอสินเชื่อของคุณได้รับการอนุมัติแล้ว",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    margin: "md"
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    margin: "lg",
                    contents: [
                      {
                        type: "text",
                        text: "💰 วงเงิน:",
                        color: "#666666",
                        size: "sm",
                        flex: 2
                      },
                      {
                        type: "text",
                        text: `${borrowerData.totalLoan?.toLocaleString() || borrowerData.amount?.toLocaleString() || 'ไม่ระบุ'} บาท`,
                        color: "#1DB446",
                        size: "md",
                        flex: 3,
                        weight: "bold"
                      }
                    ]
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "📅 กำหนดชำระ:",
                        color: "#666666",
                        size: "sm",
                        flex: 2
                      },
                      {
                        type: "text",
                        text: borrowerData.dueDate?.toDate?.()?.toLocaleDateString('th-TH') || 'ยังไม่กำหนด',
                        color: "#333333",
                        size: "sm",
                        flex: 3
                      }
                    ]
                  }
                ]
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
                height: "sm",
                action: {
                  type: "postback",
                  label: "ดูรายละเอียดการชำระ",
                  data: "action=payment_details"
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "ติดต่อเจ้าหน้าที่",
                  data: "action=contact"
                }
              }
            ]
          }
        }
      };
    } else {
      message = {
        type: "flex",
        altText: "คำขอสินเชื่อไม่ได้รับการอนุมัติ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "❌ คำขอไม่ได้รับการอนุมัติ",
                weight: "bold",
                size: "lg",
                color: "#E74C3C"
              },
              {
                type: "separator",
                margin: "md"
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: `เสียใจด้วย คุณ${borrowerData.firstName} ${borrowerData.lastName}`,
                    weight: "bold",
                    color: "#333333",
                    size: "md"
                  },
                  {
                    type: "text",
                    text: "คำขอสินเชื่อของคุณไม่ได้รับการอนุมัติในครั้งนี้",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    margin: "md"
                  },
                  {
                    type: "text",
                    text: "💡 คุณสามารถ:",
                    weight: "bold",
                    color: "#E74C3C",
                    size: "sm",
                    margin: "lg"
                  },
                  {
                    type: "text",
                    text: "• ปรับปรุงข้อมูลและสมัครใหม่\n• ติดต่อเจ้าหน้าที่เพื่อสอบถาม\n• ลองสมัครอีกครั้งในอนาคต",
                    wrap: true,
                    color: "#666666",
                    size: "sm"
                  }
                ]
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
                height: "sm",
                action: {
                  type: "postback",
                  label: "สมัครใหม่",
                  data: "action=register"
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "ติดต่อเจ้าหน้าที่",
                  data: "action=contact"
                }
              }
            ]
          }
        }
      };
    }

    await lineClient.pushMessage(userId, message);
    console.log(`✅ Sent application ${approvalStatus} notification to user ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Failed to send application ${approvalStatus} notification:`, error);
    return { success: false, error: error.message };
  }
}

// Verify LINE webhook signature
function verifySignature(body, signature) {
  const crypto = require("crypto");
  const channelSecret = LINE_CONFIG.channelSecret;
  
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  
  return hash === signature;
}

// Process incoming LINE messages
async function processLineMessage(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const userId = event.source.userId;
  const messageText = event.message.text.toLowerCase().trim();
  
  console.log(`📱 LINE Message from ${userId}: ${messageText}`);

  return await sendReply(event, messageText);
}

// Process postback events (from buttons)
async function processPostbackEvent(event) {
  const userId = event.source.userId;
  const data = event.postback.data;
  
  console.log(`🔘 Postback from ${userId}: ${data}`);

  // Parse action from postback data
  const action = data.split('=')[1];
  
  return await sendReply(event, action);
}

// Send appropriate reply based on user input
async function sendReply(event, input) {
  const userId = event.source.userId;
  let response = null;

  // Determine response based on message content or postback action
  if (input.includes("สวัสดี") || input.includes("hello") || input.includes("hi")) {
    response = AUTO_REPLIES.greeting;
  } else if (input.includes("ช่วยเหลือ") || input.includes("help") || input.includes("คำสั่ง") || 
             input.includes("เมนู") || input.includes("menu") || input === "menu") {
    response = AUTO_REPLIES.mainMenu;
  } else if (input.includes("สมัคร") || input.includes("register") || input.includes("ลงทะเบียน") || input === "register") {
    response = AUTO_REPLIES.register;
  } else if (input.includes("สถานะ") || input.includes("status") || input.includes("ตรวจสอบ") || input === "check_status") {
    response = AUTO_REPLIES.status;
  } else if (input.includes("ชำระ") || input.includes("payment") || input.includes("โอน") || input === "payment") {
    response = AUTO_REPLIES.payment;
  } else if (input.includes("ติดต่อ") || input.includes("contact") || input.includes("โทร") || input === "contact") {
    response = AUTO_REPLIES.contact;
  } else if (input.includes("เงื่อนไข") || input.includes("terms") || input.includes("ดอกเบี้ย") || input === "terms") {
    response = AUTO_REPLIES.terms;
  } else if (input.includes("เกี่ยวกับ") || input.includes("about") || input.includes("บริษัท") || input === "about") {
    response = AUTO_REPLIES.about;
  } else {
    response = AUTO_REPLIES.default;
  }

  // Send response
  try {
    if (response.type === "flex") {
      // Send Flex Message
      await lineClient.replyMessage(event.replyToken, response);
      console.log(`✅ Sent flex message to ${userId}`);
      return { success: true, messageType: "flex" };
    } else if (Array.isArray(response)) {
      // Send text messages
      const filteredMessages = response
        .filter(text => text && text.trim().length > 0)
        .slice(0, 5);
      
      const messages = filteredMessages.map(text => ({ type: "text", text }));
      await lineClient.replyMessage(event.replyToken, messages);
      console.log(`✅ Sent ${messages.length} text messages to ${userId}`);
      return { success: true, messagesSent: messages.length };
    }
  } catch (error) {
    console.error("❌ Failed to send LINE reply:", error);
    return { success: false, error: error.message };
  }

  return null;
}

// Process follow event (when user adds the bot)
async function processFollowEvent(event) {
  const userId = event.source.userId;
  
  console.log(`👋 New follower: ${userId}`);

  try {
    // Get user profile
    const profile = await lineClient.getProfile(userId);
    console.log(`📝 User profile: ${profile.displayName}`);

    // Send welcome flex message
    await lineClient.replyMessage(event.replyToken, AUTO_REPLIES.welcome);
    
    console.log(`✅ Sent welcome flex message to ${profile.displayName} (${userId})`);
    
    return { success: true, userId, displayName: profile.displayName };
  } catch (error) {
    console.error("❌ Failed to process follow event:", error);
    return { success: false, error: error.message };
  }
}

// Process unfollow event (when user blocks/unfriends the bot)
async function processUnfollowEvent(event) {
  const userId = event.source.userId;
  
  console.log(`👋 User unfollowed: ${userId}`);
  
  try {
    return { success: true, userId };
  } catch (error) {
    console.error("❌ Failed to process unfollow event:", error);
    return { success: false, error: error.message };
  }
}

// Main event processor for all LINE events
async function processLineEvent(event) {
  console.log(`📨 LINE Event received: ${event.type}`);
  
  try {
    switch (event.type) {
      case "message":
        return await processLineMessage(event);
      
      case "postback":
        return await processPostbackEvent(event);
      
      case "follow":
        return await processFollowEvent(event);
      
      case "unfollow":
        return await processUnfollowEvent(event);
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
        return { success: true, message: "Event type not handled" };
    }
  } catch (error) {
    console.error(`❌ Error processing LINE event:`, error);
    return { success: false, error: error.message };
  }
}

async function sendPushMessage(userId, messages) {
  try {
    const messageObjects = messages.map(text => ({ type: "text", text }));
    await lineClient.pushMessage(userId, messageObjects);
    console.log(`✅ Sent push message to ${userId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send push message:", error);
    return { success: false, error: error.message };
  }
}

// Send broadcast message to all users
async function sendBroadcastMessage(messages) {
  try {
    const messageObjects = messages.map(text => ({ type: "text", text }));
    await lineClient.broadcast(messageObjects);
    console.log("✅ Sent broadcast message");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send broadcast message:", error);
    return { success: false, error: error.message };
  }
}
