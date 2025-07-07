// functions/routes/slipApproval.js
const admin = require("firebase-admin");
const { sendSlipApprovalNotification, sendApplicationStatusNotification } = require("../line-auto-reply");

const db = admin.firestore();

// API สำหรับแอดมินอนุมัติ/ปฏิเสธสลีป
async function handleSlipApproval(req, res) {
  try {
    const { slipId, action, adminId } = req.body;
    
    if (!slipId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง" 
      });
    }

    console.log(`🔧 Admin ${adminId} ${action}ing slip ${slipId}`);

    // ดึงข้อมูลสลีป
    const slipRef = db.collection('payment_slips').doc(slipId);
    const slipDoc = await slipRef.get();
    
    if (!slipDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "ไม่พบสลีปที่ระบุ" 
      });
    }
    
    const slipData = slipDoc.data();
    const userId = slipData.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "ไม่พบข้อมูลผู้ใช้ในสลีป" 
      });
    }

    // อัปเดตสถานะสลีป
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: adminId || 'admin'
    };

    await slipRef.update(updateData);

    // ส่งการแจ้งเตือนให้ผู้ใช้
    const notificationResult = await sendSlipApprovalNotification(
      userId, 
      slipData, 
      action === 'approve' ? 'approved' : 'rejected'
    );

    console.log(`✅ Slip ${slipId} ${action}ed and notification sent:`, notificationResult);

    res.json({ 
      success: true, 
      message: `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}สลีปสำเร็จ`,
      notificationSent: notificationResult.success
    });

  } catch (error) {
    console.error(`❌ Error in slip ${req.body.action}:`, error);
    res.status(500).json({ 
      success: false, 
      error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" 
    });
  }
}

// API สำหรับแอดมินอนุมัติ/ปฏิเสธการสมัครสินเชื่อ
async function handleApplicationApproval(req, res) {
  try {
    const { borrowerId, action, adminId } = req.body;
    
    if (!borrowerId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง" 
      });
    }

    console.log(`🔧 Admin ${adminId} ${action}ing application ${borrowerId}`);

    // ดึงข้อมูลผู้สมัคร
    const borrowerRef = db.collection('borrowers').doc(borrowerId);
    const borrowerDoc = await borrowerRef.get();
    
    if (!borrowerDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: "ไม่พบผู้สมัครที่ระบุ" 
      });
    }
    
    const borrowerData = borrowerDoc.data();
    const userId = borrowerData.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "ไม่พบข้อมูลผู้ใช้ในใบสมัคร" 
      });
    }

    // อัปเดตสถานะการสมัคร
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: adminId || 'admin'
    };

    // ถ้าอนุมัติ ให้เพิ่มข้อมูลการชำระ
    if (action === 'approve') {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1); // กำหนดครบกำหนดเดือนหน้า
      
      updateData.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.dueDate = dueDate;
    }

    await borrowerRef.update(updateData);

    // ส่งการแจ้งเตือนให้ผู้ใช้
    const notificationResult = await sendApplicationStatusNotification(
      userId, 
      { ...borrowerData, ...updateData }, 
      action === 'approve' ? 'approved' : 'rejected'
    );

    console.log(`✅ Application ${borrowerId} ${action}ed and notification sent:`, notificationResult);

    res.json({ 
      success: true, 
      message: `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}การสมัครสำเร็จ`,
      notificationSent: notificationResult.success
    });

  } catch (error) {
    console.error(`❌ Error in application ${req.body.action}:`, error);
    res.status(500).json({ 
      success: false, 
      error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" 
    });
  }
}

module.exports = {
  handleSlipApproval,
  handleApplicationApproval
};
