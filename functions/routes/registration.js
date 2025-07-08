// 📝 Registration Routes Module
const express = require("express");
const admin = require("firebase-admin");
const { createRegistrationLimiter } = require("../middleware/security");
const validationService = require("../validation");
const creditScoringService = require("../creditScoring");
const governmentAPI = require("../governmentAPI");
const securityService = require("../security");
const loanHelpers = require("../modules/loanHelpers");

const router = express.Router();

// เลื่อนการเรียกใช้ db ไปใน function เพื่อให้ Firebase Admin initialize ก่อน
function getDb() {
  return admin.firestore();
}

// LIFF Register endpoint with production-grade security and validation
router.post("/liff-register", createRegistrationLimiter(), async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`📥 Registration request [${requestId}]:`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      hasBody: !!req.body
    });

    // Enhanced input validation using validation service
    const validation = validationService.validateRegistration(req.body);
    if (!validation.isValid) {
      console.log(`❌ Validation failed [${requestId}]:`, validation.errors);

      // Log validation failure
      await securityService.logSecurityEvent("validation_failed", {
        requestId,
        errors: validation.errors,
        requestBody: req.body
      }, req);

      return res.status(400).json({
        error: "Validation failed",
        message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
        details: validation.errors
      });
    }

    const userData = validation.data;
    console.log(`✅ Input validation passed [${requestId}]:`, userData.firstName, userData.lastName);

    // 🔍 Enhanced image handling - support both combined and separate images
    const imageData = {};

    // Handle combined images or separate images
    if (req.body.idCardImage) {
      imageData.idCardImage = req.body.idCardImage;
      imageData.idCardImageName = req.body.idCardImageName || "id_card.jpg";
      imageData.idCardImageSize = req.body.idCardImageSize || 0;
    }

    if (req.body.selfieImage) {
      imageData.selfieImage = req.body.selfieImage;
      imageData.selfieImageName = req.body.selfieImageName || "selfie.jpg";
      imageData.selfieImageSize = req.body.selfieImageSize || 0;
    }

    // Validate required images
    if (!imageData.idCardImage) {
      console.log(`⚠️ Missing ID card image [${requestId}]`);
      return res.status(400).json({
        error: "Missing ID card image",
        message: "กรุณาอัปโหลดรูปบัตรประชาชน"
      });
    }

    if (!imageData.selfieImage) {
      console.log(`⚠️ Missing selfie image [${requestId}]`);
      return res.status(400).json({
        error: "Missing selfie image", 
        message: "กรุณาอัปโหลดรูปถ่ายของคุณ"
      });
    }

    console.log(`📷 Image processing [${requestId}]:`, {
      hasIdCard: !!imageData.idCardImage,
      hasSelfie: !!imageData.selfieImage,
      idCardSize: imageData.idCardImageSize,
      selfieSize: imageData.selfieImageSize
    });

    // 🔍 ตรวจสอบรูปแบบบัตรประชาชนผ่าน API
    console.log(`🔍 Verifying ID Card via API [${requestId}]`);

    const idCardValidation = await governmentAPI.validateIDCardBasic(userData.idCard);
    if (!idCardValidation.isValid) {
      console.log(`❌ ID Card validation failed [${requestId}]:`, idCardValidation.errors);

      await securityService.logSecurityEvent("invalid_id_card", {
        requestId,
        idCard: userData.idCard,
        errors: idCardValidation.errors
      }, req);

      return res.status(400).json({
        error: "Invalid ID Card",
        message: "เลขบัตรประชาชนไม่ถูกต้อง",
        details: idCardValidation.errors
      });
    }

    // 🔍 ตรวจสอบสถานะบัตรประชาชน
    const cardVerification = await governmentAPI.verifyIDCardStatus(userData.idCard);
    if (!cardVerification.valid) {
      console.log(`❌ ID Card verification failed [${requestId}]:`, cardVerification.message);

      await securityService.logSecurityEvent("id_card_verification_failed", {
        requestId,
        idCard: userData.idCard,
        status: cardVerification.status,
        message: cardVerification.message
      }, req);

      return res.status(400).json({
        error: "ID Card verification failed",
        message: cardVerification.message,
        status: cardVerification.status
      });
    }

    console.log(`✅ ID Card verified successfully [${requestId}]`);

    // เพิ่มข้อมูลการตรวจสอบเข้ากับข้อมูลผู้ใช้
    const enhancedUserData = {
      ...userData,
      ...imageData, // รวมข้อมูลรูปภาพ
      idCardVerified: true,
      idCardStatus: cardVerification.status,
      verificationTimestamp: new Date().toISOString()
    };

    console.log(`✅ Enhanced user data prepared [${requestId}]`);

    // Enhanced blacklist check with detailed logging
    const isBlacklisted = await loanHelpers.checkBlacklist(enhancedUserData.idCard, enhancedUserData.userId);
    if (isBlacklisted) {
      console.log(`🚫 Blacklist detected [${requestId}]:`, enhancedUserData.idCard);

      // Log blacklist attempt with high priority
      await securityService.logSecurityEvent("blacklist_attempt", {
        requestId,
        idCard: enhancedUserData.idCard,
        userId: enhancedUserData.userId,
        userName: `${enhancedUserData.firstName} ${enhancedUserData.lastName}`,
        severity: "HIGH"
      }, req);

      return res.status(403).json({
        error: "Application not permitted",
        message: "ไม่สามารถยื่นคำขอได้ กรุณาติดต่อเจ้าหน้าที่"
      });
    }

    // Enhanced duplicate check
    const isDuplicate = await loanHelpers.checkDuplicateApplication(enhancedUserData.idCard, enhancedUserData.userId);
    if (isDuplicate) {
      console.log(`🔄 Duplicate application [${requestId}]:`, enhancedUserData.idCard);

      await securityService.logSecurityEvent("duplicate_application", {
        requestId,
        idCard: enhancedUserData.idCard,
        userId: enhancedUserData.userId
      }, req);

      return res.status(409).json({
        error: "Duplicate application",
        message: "มีการยื่นคำขอที่อยู่ในระหว่างการพิจารณาแล้ว หรือยื่นคำขอใหม่เร็วเกินไป"
      });
    }

    // Enhanced credit scoring with detailed analysis
    const creditAssessment = await creditScoringService.calculateCreditScore(enhancedUserData, enhancedUserData.userId);
    console.log(`📊 Credit assessment [${requestId}]:`, {
      score: creditAssessment.score,
      grade: creditAssessment.grade,
      riskLevel: creditAssessment.riskLevel,
      recommendation: creditAssessment.recommendation
    });

    // Calculate loan terms with enhanced logic
    const loanTerms = loanHelpers.calculateLoanTerms(enhancedUserData, creditAssessment);

    // Auto-approval logic with enhanced criteria
    const autoApproval = loanHelpers.determineAutoApproval(creditAssessment, enhancedUserData, loanTerms);

    // Create comprehensive borrower record with image data
    const borrowerData = loanHelpers.createBorrowerRecord(enhancedUserData, creditAssessment, loanTerms, autoApproval, req, requestId, imageData);

    // Save to Firestore with transaction
    const docRef = await getDb().collection("borrowers").add(borrowerData);
    console.log(`💾 Borrower record created [${requestId}]:`, docRef.id);

    // Log successful application
    await Promise.all([
      getDb().collection("applicationLogs").add({
        type: "new_application",
        requestId,
        borrowerId: docRef.id,
        userId: enhancedUserData.userId,
        idCard: enhancedUserData.idCard,
        amount: enhancedUserData.amount,
        creditScore: creditAssessment.score,
        status: autoApproval.status,
        autoApproved: autoApproval.autoApproved,
        dataSource: "government_registry",
        verificationTimestamp: enhancedUserData.verificationTimestamp,
        processingTime: Date.now() - startTime,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }),

      // Send notification if approved
      autoApproval.autoApproved ? loanHelpers.sendApprovalNotification(enhancedUserData, loanTerms, docRef.id) : null
    ]);

    // Generate comprehensive response
    const responseData = {
      success: true,
      message: autoApproval.autoApproved ?
        "🎉 อนุมัติเงินกู้สำเร็จ! จำนวนเงินจะถูกโอนเข้าบัญชีภายใน 24 ชั่วโมง" :
        "📝 ยื่นคำขอสำเร็จ! รอการอนุมัติจากเจ้าหน้าที่ (การอนุมัติใช้เวลา 1-24 ชั่วโมง)",
      applicationId: docRef.id,
      requestId: requestId,
      data: {
        applicant: {
          firstName: enhancedUserData.firstName,
          lastName: enhancedUserData.lastName,
          idCard: `${enhancedUserData.idCard.substr(0, 4)}-xxxx-xxxx-x${enhancedUserData.idCard.substr(-1)}`,
          verified: enhancedUserData.idCardVerified
        },
        loan: {
          requestedAmount: enhancedUserData.amount,
          totalAmount: loanTerms.totalWithInterest,
          interestRate: `${(loanTerms.interestRate * 100).toFixed(1)}%`,
          frequency: enhancedUserData.frequency,
          dueDate: loanTerms.dueDate.toLocaleDateString("th-TH"),
          installmentAmount: loanTerms.installmentAmount
        },
        assessment: {
          creditScore: creditAssessment.score,
          grade: creditAssessment.grade,
          riskLevel: creditAssessment.riskLevel,
          status: autoApproval.status,
          autoApproved: autoApproval.autoApproved
        },
        verification: {
          idCardStatus: enhancedUserData.idCardStatus,
          verifiedAt: enhancedUserData.verificationTimestamp
        },
        nextSteps: autoApproval.autoApproved ?
          ["กรุณาเตรียมเอกสารประกอบการกู้", "รอการติดต่อจากเจ้าหน้าที่"] :
          ["รอการอนุมัติจากเจ้าหน้าที่", "ระยะเวลาพิจารณา 1-3 วันทำการ"]
      }
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ Registration completed [${requestId}]:`, {
      id: docRef.id,
      name: `${enhancedUserData.titleName} ${enhancedUserData.officialFirstName || enhancedUserData.firstName} ${enhancedUserData.officialLastName || enhancedUserData.lastName}`,
      amount: enhancedUserData.amount,
      status: autoApproval.status,
      creditScore: creditAssessment.score,
      dataSource: "government_registry",
      processingTime: `${processingTime}ms`
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error(`❌ Registration error [${requestId}]:`, error);

    // Enhanced error logging
    try {
      await Promise.all([
        getDb().collection("errorLogs").add({
          type: "registration_error",
          requestId,
          error: error.message,
          stack: error.stack,
          requestBody: req.body,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }),

        securityService.logSecurityEvent("registration_system_error", {
          requestId,
          error: error.message,
          severity: "HIGH"
        }, req)
      ]);
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    res.status(500).json({
      error: "Internal server error",
      message: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่",
      requestId: requestId
    });
  }
});

module.exports = router;