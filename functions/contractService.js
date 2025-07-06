/**
 * Digital Contract Service - ระบบสัญญาอิเล็กทรอนิกส์
 * สร้างสัญญาตามกฎหมายและจัดการการยืนยัน
 */

const admin = require("firebase-admin");

class ContractService {
  /**
   * สร้างสัญญาดิจิทัล
   */
  static generateContract(borrowerData, loanTerms, settings) {
    const contractData = {
      contractId: `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      borrower: {
        fullName: `${borrowerData.firstName} ${borrowerData.lastName}`,
        idCard: borrowerData.idCard,
        address: borrowerData.currentAddress || borrowerData.address,
        birthDate: borrowerData.birthDate
      },
      loan: {
        principal: loanTerms.principalAmount || borrowerData.amount,
        interestRate: loanTerms.interestRate,
        totalAmount: loanTerms.totalWithInterest,
        frequency: borrowerData.frequency,
        dueDate: loanTerms.dueDate,
        installmentAmount: loanTerms.installmentAmount
      },
      terms: this.generateLegalTerms(borrowerData, loanTerms, settings),
      createdAt: new Date().toISOString(),
      status: "pending_signature"
    };

    return contractData;
  }

  /**
   * สร้างข้อกำหนดตามกฎหมาย
   */
  static generateLegalTerms(borrowerData, loanTerms, settings) {
    const interestRatePercent = (loanTerms.interestRate * 100).toFixed(2);
    const frequencyText = this.getFrequencyText(borrowerData.frequency);

    return {
      article1: {
        title: "ข้อที่ 1 การให้กู้เงิน",
        content: `ผู้ให้กู้ตกลงให้ผู้กู้กู้เงินจำนวน ${borrowerData.amount.toLocaleString()} บาท (${this.numberToThaiText(borrowerData.amount)}) โดยผู้กู้ได้รับเงินครบถ้วนแล้ว`
      },
      article2: {
        title: "ข้อที่ 2 อัตราดอกเบี้ย",
        content: `ผู้กู้ตกลงชำระดอกเบี้ยในอัตรา ${interestRatePercent}% ต่อ ${frequencyText} ซึ่งเป็นอัตราที่กฎหมายอนุญาต`
      },
      article3: {
        title: "ข้อที่ 3 การชำระหนี้",
        content: `ผู้กู้จะชำระหนี้ ${frequencyText} ในอัตรา ${loanTerms.installmentAmount.toLocaleString()} บาท จนครบจำนวน ${loanTerms.totalWithInterest.toLocaleString()} บาท`
      },
      article4: {
        title: "ข้อที่ 4 การผิดนัด",
        content: "หากผู้กู้ผิดนัดชำระหนี้เกิน 7 วัน ผู้ให้กู้มีสิทธิเรียกร้องให้ชำระหนี้ทั้งหมดทันที"
      },
      article5: {
        title: "ข้อที่ 5 การคุ้มครองข้อมูล",
        content: "ผู้ให้กู้จะเก็บรักษาข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
      },
      legalBasis: "สัญญานี้จัดทำตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 648-679 และพระราชบัญญัติการให้เงินกู้ที่เป็นการเพิ่มทุนให้แก่เกษตรกรและผู้ประกอบการรายย่อย พ.ศ. 2560"
    };
  }

  /**
   * แปลงตัวเลขเป็นข้อความไทย
   */
  static numberToThaiText(number) {
    const ones = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const tens = ["", "", "ยี่", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    if (number === 0) return "ศูนย์";

    const str = number.toString();
    const result = "";

    // Simple implementation for common numbers
    if (number < 10) return ones[number];
    if (number >= 1000000) return `${Math.floor(number/1000000)}ล้าน${number%1000000 > 0 ? this.numberToThaiText(number%1000000) : ""}`;
    if (number >= 1000) return `${this.numberToThaiText(Math.floor(number/1000))}พัน${number%1000 > 0 ? this.numberToThaiText(number%1000) : ""}`;
    if (number >= 100) return `${ones[Math.floor(number/100)]}ร้อย${number%100 > 0 ? this.numberToThaiText(number%100) : ""}`;
    if (number >= 20) return `${tens[Math.floor(number/10)]}สิบ${number%10 > 0 ? ones[number%10] : ""}`;
    if (number >= 10) return `หนึ่งสิบ${number%10 > 0 ? ones[number%10] : ""}`;

    return ones[number];
  }

  /**
   * แปลงความถี่เป็นข้อความไทย
   */
  static getFrequencyText(frequency) {
    const frequencies = {
      daily: "วัน",
      weekly: "สัปดาห์",
      monthly: "เดือน"
    };
    return frequencies[frequency] || "เดือน";
  }

  /**
   * สร้าง HTML สัญญา
   */
  static generateContractHTML(contractData) {
    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>สัญญาเงินกู้ออนไลน์</title>
        <style>
            body { font-family: 'Sarabun', sans-serif; line-height: 1.6; margin: 20px; }
            .contract-header { text-align: center; margin-bottom: 30px; }
            .contract-content { max-width: 800px; margin: 0 auto; }
            .article { margin-bottom: 20px; }
            .article-title { font-weight: bold; color: #2563eb; }
            .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { border: 1px solid #ccc; padding: 20px; width: 300px; text-align: center; }
            .contract-id { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
            @media print { body { margin: 0; } }
        </style>
    </head>
    <body>
        <div class="contract-content">
            <div class="contract-header">
                <h1>สัญญาเงินกู้ออนไลน์</h1>
                <p>เลขที่สัญญา: ${contractData.contractId}</p>
                <p>วันที่: ${new Date().toLocaleDateString("th-TH")}</p>
            </div>

            <p><strong>ผู้ให้กู้:</strong> บริษัท บ้านทีเค จำกัด</p>
            <p><strong>ผู้กู้:</strong> ${contractData.borrower.fullName}</p>
            <p><strong>เลขบัตรประชาชน:</strong> ${contractData.borrower.idCard}</p>
            <p><strong>ที่อยู่:</strong> ${contractData.borrower.address}</p>

            <div class="article">
                <div class="article-title">${contractData.terms.article1.title}</div>
                <p>${contractData.terms.article1.content}</p>
            </div>

            <div class="article">
                <div class="article-title">${contractData.terms.article2.title}</div>
                <p>${contractData.terms.article2.content}</p>
            </div>

            <div class="article">
                <div class="article-title">${contractData.terms.article3.title}</div>
                <p>${contractData.terms.article3.content}</p>
            </div>

            <div class="article">
                <div class="article-title">${contractData.terms.article4.title}</div>
                <p>${contractData.terms.article4.content}</p>
            </div>

            <div class="article">
                <div class="article-title">${contractData.terms.article5.title}</div>
                <p>${contractData.terms.article5.content}</p>
            </div>

            <p><strong>ข้อกำหนดทางกฎหมาย:</strong> ${contractData.terms.legalBasis}</p>

            <div class="signature-area">
                <div class="signature-box">
                    <p>ผู้ให้กู้</p>
                    <br><br><br>
                    <p>................................</p>
                    <p>บริษัท บ้านทีเค จำกัด</p>
                </div>
                <div class="signature-box">
                    <p>ผู้กู้</p>
                    <br><br><br>
                    <p>................................</p>
                    <p>${contractData.borrower.fullName}</p>
                </div>
            </div>

            <div class="contract-id">
                <p>สัญญาอิเล็กทรอนิกส์ - ระบบ BaanTK</p>
                <p>สร้างเมื่อ: ${contractData.createdAt}</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * บันทึกสัญญาลง Database
   */
  static async saveContract(contractData, borrowerId) {
    try {
      const docRef = await admin.firestore().collection("contracts").add({
        ...contractData,
        borrowerId,
        signedAt: null,
        ipAddress: null,
        userAgent: null
      });

      console.log(`📄 Contract created: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("Error saving contract:", error);
      throw error;
    }
  }

  /**
   * ยืนยันการลงนามสัญญา
   */
  static async signContract(contractId, borrowerId, signatureData, req) {
    try {
      await admin.firestore().collection("contracts").doc(contractId).update({
        status: "signed",
        signedAt: admin.firestore.FieldValue.serverTimestamp(),
        signatureData,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });

      // อัพเดทสถานะผู้กู้
      await admin.firestore().collection("borrowers").doc(borrowerId).update({
        contractSigned: true,
        contractId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Contract signed: ${contractId}`);
      return true;
    } catch (error) {
      console.error("Error signing contract:", error);
      throw error;
    }
  }
}

module.exports = ContractService;
