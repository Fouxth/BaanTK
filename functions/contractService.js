// 📄 Contract Generation and Management Service
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

class ContractService {
  constructor() {
    this.contractVersion = "2.0";
  }

  // Generate contract data
  generateContract(borrowerData, loanTerms, settings = {}) {
    const contractId = uuidv4();
    const today = new Date();
    
    return {
      contractId: contractId,
      version: this.contractVersion,
      borrowerId: borrowerData.id || borrowerData.borrowerId,
      
      // Borrower information
      borrower: {
        name: `${borrowerData.firstName} ${borrowerData.lastName}`,
        idCard: borrowerData.idCard,
        address: borrowerData.address,
        userId: borrowerData.userId
      },
      
      // Loan terms
      loan: {
        principal: loanTerms.principal,
        interestRate: loanTerms.interestRate,
        totalAmount: loanTerms.totalWithInterest,
        installmentAmount: loanTerms.installmentAmount,
        installments: loanTerms.installments,
        frequency: loanTerms.frequency,
        startDate: today.toISOString(),
        dueDate: loanTerms.dueDate.toISOString()
      },
      
      // Legal terms
      terms: this.generateLegalTerms(loanTerms, settings),
      
      // Contract status
      status: "pending_signature",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Signature fields
      signatures: {
        borrower: null,
        lender: null
      },
      
      // Additional metadata
      metadata: {
        generatedBy: "system",
        ipAddress: null,
        userAgent: null
      }
    };
  }

  // Generate legal terms and conditions
  generateLegalTerms(loanTerms, settings) {
    const frequencyText = this.getFrequencyText(loanTerms.frequency);
    
    return {
      title: "สัญญาเงินกู้ BaanTK",
      clauses: [
        {
          section: "1. ข้อมูลเงินกู้",
          content: `ผู้กู้ตกลงกู้เงินจำนวน ${loanTerms.principal.toLocaleString()} บาท โดยมีดอกเบี้ย ${(loanTerms.interestRate * 100).toFixed(2)}% ต่อปี`
        },
        {
          section: "2. การชำระเงิน",
          content: `ผู้กู้ตกลงชำระเงินงวดละ ${loanTerms.installmentAmount.toLocaleString()} บาท ${frequencyText} รวม ${loanTerms.installments} งวด`
        },
        {
          section: "3. เงื่อนไขการผิดนัด",
          content: "หากผู้กู้ผิดนัดการชำระเงินเกิน 7 วัน ผู้ให้กู้มีสิทธิ์เรียกเงินต้นและดอกเบี้ยคืนทั้งหมดทันที"
        },
        {
          section: "4. การยกเลิกสัญญา",
          content: "ผู้กู้สามารถชำระเงินก่อนกำหนดได้โดยไม่มีค่าปรับ"
        },
        {
          section: "5. ข้อตกลงทั่วไป",
          content: "สัญญานี้อยู่ภายใต้กฎหมายไทย และข้อพิพาทจะได้รับการระงับโดยการไกล่เกลี่ย"
        }
      ],
      acceptanceText: "ข้าพเจ้าได้อ่านและเข้าใจเงื่อนไขทั้งหมดแล้ว และยินยอมผูกพันตามสัญญานี้",
      signatureDate: new Date().toLocaleDateString("th-TH"),
      effectiveDate: new Date().toLocaleDateString("th-TH")
    };
  }

  // Get frequency text in Thai
  getFrequencyText(frequency) {
    const frequencyMap = {
      daily: "ทุกวัน",
      weekly: "ทุกสัปดาห์", 
      monthly: "ทุกเดือน"
    };
    return frequencyMap[frequency] || "ตามกำหนด";
  }

  // Save contract to database
  async saveContract(contractData, borrowerId) {
    try {
      const db = admin.firestore();
      
      // Save contract
      const contractRef = await db.collection("contracts").add(contractData);
      
      // Update borrower with contract reference
      if (borrowerId) {
        await db.collection("borrowers").doc(borrowerId).update({
          contractId: contractRef.id,
          contractGenerated: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`📄 Contract saved: ${contractRef.id}`);
      return contractRef.id;
    } catch (error) {
      console.error("Error saving contract:", error);
      throw error;
    }
  }

  // Sign contract
  async signContract(contractId, borrowerId, signatureData, req = null) {
    try {
      const db = admin.firestore();
      const contractRef = db.collection("contracts").doc(contractId);
      
      const updateData = {
        "signatures.borrower": {
          signature: signatureData.signature,
          timestamp: signatureData.timestamp || admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: signatureData.ipAddress || req?.ip,
          userAgent: signatureData.userAgent || req?.get("User-Agent")
        },
        status: "signed",
        signedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await contractRef.update(updateData);
      
      console.log(`✍️ Contract signed: ${contractId}`);
      return true;
    } catch (error) {
      console.error("Error signing contract:", error);
      throw error;
    }
  }

  // Generate contract HTML for display/printing
  generateContractHTML(contractData) {
    const { borrower, loan, terms } = contractData;
    
    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>สัญญาเงินกู้ - ${contractData.contractId}</title>
        <style>
            body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { width: 200px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${terms.title}</h1>
            <p>เลขที่สัญญา: ${contractData.contractId}</p>
            <p>วันที่: ${terms.signatureDate}</p>
        </div>
        
        <div class="section">
            <h3>ข้อมูลผู้กู้</h3>
            <p><strong>ชื่อ:</strong> ${borrower.name}</p>
            <p><strong>เลขบัตรประชาชน:</strong> ${borrower.idCard}</p>
            <p><strong>ที่อยู่:</strong> ${borrower.address}</p>
        </div>
        
        <div class="section">
            <h3>รายละเอียดเงินกู้</h3>
            <table>
                <tr><th>รายการ</th><th>จำนวน</th></tr>
                <tr><td>เงินต้น</td><td>${loan.principal.toLocaleString()} บาท</td></tr>
                <tr><td>อัตราดอกเบี้ย</td><td>${(loan.interestRate * 100).toFixed(2)}% ต่อปี</td></tr>
                <tr><td>จำนวนเงินรวม</td><td>${loan.totalAmount.toLocaleString()} บาท</td></tr>
                <tr><td>ชำระงวดละ</td><td>${loan.installmentAmount.toLocaleString()} บาท</td></tr>
                <tr><td>จำนวนงวด</td><td>${loan.installments} งวด</td></tr>
                <tr><td>ความถี่การชำระ</td><td>${this.getFrequencyText(loan.frequency)}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>เงื่อนไขและข้อตกลง</h3>
            ${terms.clauses.map(clause => `
                <div style="margin-bottom: 15px;">
                    <strong>${clause.section}</strong><br>
                    ${clause.content}
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <p><strong>การยอมรับเงื่อนไข:</strong></p>
            <p>${terms.acceptanceText}</p>
        </div>
        
        <div class="signature-area">
            <div class="signature-box">
                <p>ลายเซ็นผู้กู้</p>
                <p>(${borrower.name})</p>
            </div>
            <div class="signature-box">
                <p>ลายเซ็นผู้ให้กู้</p>
                <p>(BaanTK)</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Convert number to Thai text (for legal documents)
  numberToThaiText(number) {
    // Simplified version - in production, use a proper Thai number conversion library
    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const tens = ['', '', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ'];
    
    if (number === 0) return 'ศูนย์';
    if (number < 10) return ones[number];
    if (number < 100) {
      const ten = Math.floor(number / 10);
      const one = number % 10;
      return tens[ten] + ones[one];
    }
    
    // For larger numbers, return the number as string
    return number.toString();
  }
}

module.exports = new ContractService();
