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

  // Generate legal terms and conditions (Enhanced Thai Legal Contract)
  generateLegalTerms(loanTerms, settings) {
    const frequencyText = this.getFrequencyText(loanTerms.frequency);
    const today = new Date();
    const contractDate = today.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
    return {
      title: "สัญญาเงินกู้ BaanTK",
      contractDate: contractDate,
      
      // หมวดข้อกำหนดหลัก
      mainClauses: [
        {
          section: "ข้อ 1. วัตถุประสงค์ของสัญญา",
          subsections: [
            {
              number: "1.1",
              content: `ผู้ให้กู้ตกลงให้ผู้กู้กู้เงินเป็นจำนวน ${loanTerms.principal.toLocaleString()} บาท (${this.numberToThaiText(loanTerms.principal)}) โดยมีอัตราดอกเบี้ย ${(loanTerms.interestRate * 100).toFixed(2)}% ต่อปี`
            },
            {
              number: "1.2", 
              content: `เงินกู้นี้มีวัตถุประสงค์เพื่อใช้เป็นเงินทุนหมุนเวียนในการดำเนินชีวิต โดยผู้กู้รับรองว่าจะไม่นำไปใช้ในกิจกรรมที่ผิดกฎหมาย`
            }
          ]
        },
        {
          section: "ข้อ 2. การชำระเงิน",
          subsections: [
            {
              number: "2.1",
              content: `ผู้กู้ตกลงชำระเงิน${frequencyText} ในอัตรา ${loanTerms.installmentAmount.toLocaleString()} บาทต่องวด รวม ${loanTerms.installments} งวด`
            },
            {
              number: "2.2",
              content: `การชำระเงินแต่ละงวดต้องชำระภายในวันที่กำหนด หากผิดนัดจะมีค่าปรับ 2% ต่อวันของยอดเงินที่ค้างชำระ`
            },
            {
              number: "2.3", 
              content: `ผู้กู้สามารถชำระเงินก่อนกำหนดได้โดยไม่มีค่าปรับ และจะได้รับการลดดอกเบี้ยตามสัดส่วนของเวลาที่เหลือ`
            }
          ]
        },
        {
          section: "ข้อ 3. เงื่อนไขการผิดนัด",
          subsections: [
            {
              number: "3.1",
              content: `หากผู้กู้ผิดนัดการชำระเงินเกิน 7 (เจ็ด) วันติดต่อกัน ผู้ให้กู้มีสิทธิ์เรียกให้ชำระเงินต้นและดอกเบี้ยคืนทั้งหมดทันที`
            },
            {
              number: "3.2", 
              content: `ในกรณีผิดนัด ผู้กู้ต้องรับผิดชอบค่าใช้จ่ายในการติดตามทวงถาม เช่น ค่าโทรศัพท์ ค่าจดหมาย และค่าใช้จ่ายอื่นๆ ที่เกี่ยวข้อง`
            },
            {
              number: "3.3",
              content: `ผู้ให้กู้มีสิทธิ์แจ้งข้อมูลการผิดนัดไปยังบูโรเครดิต เพื่อบันทึกประวัติเครดิตของผู้กู้`
            }
          ]
        },
        {
          section: "ข้อ 4. หลักประกัน",
          subsections: [
            {
              number: "4.1",
              content: `ผู้กู้ยินยอมให้ข้อมูลส่วนบุคคลและเอกสารประกอบเป็นหลักประกันในการกู้เงินครั้งนี้`
            },
            {
              number: "4.2",
              content: `ผู้กู้รับรองว่าข้อมูลทั้งหมดที่ให้ไว้เป็นความจริง และหากมีการเปลี่ยนแปลงจะแจ้งให้ผู้ให้กู้ทราบโดยทันที`
            }
          ]
        },
        {
          section: "ข้อ 5. การคุ้มครองข้อมูลส่วนบุคคล",
          subsections: [
            {
              number: "5.1", 
              content: `ผู้ให้กู้จะเก็บรักษาข้อมูลส่วนบุคคลของผู้กู้ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562`
            },
            {
              number: "5.2",
              content: `ข้อมูลส่วนบุคคลจะถูกใช้เพื่อวัตถุประสงค์ในการให้บริการเงินกู้เท่านั้น และจะไม่เปิดเผยแก่บุคคลที่สามโดยไม่ได้รับความยินยอม`
            }
          ]
        },
        {
          section: "ข้อ 6. การระงับข้อพิพาท",
          subsections: [
            {
              number: "6.1",
              content: `ข้อพิพาทที่เกิดขึ้นจากสัญญานี้ให้แก้ไขโดยการเจรจาเป็นลำดับแรก หากไม่สามารถตกลงได้ให้นำข้อพิพาทไปยังศาลที่มีเขตอำนาจ`
            },
            {
              number: "6.2", 
              content: `สัญญานี้อยู่ภายใต้บังคับของกฎหมายไทย และศาลไทยมีเขตอำนาจในการพิจารณาคดี`
            }
          ]
        },
        {
          section: "ข้อ 7. ข้อกำหนดทั่วไป",
          subsections: [
            {
              number: "7.1",
              content: `สัญญานี้มีผลบังคับใช้นับจากวันที่ลงนามและจะสิ้นสุดเมื่อผู้กู้ชำระหนี้ครบถ้วนแล้ว`
            },
            {
              number: "7.2",
              content: `การแก้ไขเปลี่ยนแปลงสัญญานี้ต้องทำเป็นลายลักษณ์อักษรและมีลายมือชื่อของคู่สัญญาทั้งสองฝ่าย`
            },
            {
              number: "7.3",
              content: `หากข้อใดในสัญญานี้เป็นโมฆะหรือไม่สามารถบังคับได้ ให้ข้ออื่นยังคงมีผลบังคับใช้`
            }
          ]
        }
      ],
      
      // คำยินยอมและการรับรอง
      consentClauses: [
        {
          title: "การยินยอมเก็บรวบรวมข้อมูลส่วนบุคคล",
          content: `ข้าพเจ้ายินยอมให้ บริษัท บ้านทีเค จำกัด เก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า ตามนโยบายคุ้มครองข้อมูลส่วนบุคคลของบริษัท เพื่อวัตถุประสงค์ในการให้บริการเงินกู้ การประเมินความเสี่ยง การติดตามหนี้ และการปฏิบัติตามกฎหมาย`
        },
        {
          title: "การยินยอมตรวจสอบข้อมูลเครดิต", 
          content: `ข้าพเจ้ายินยอมให้ผู้ให้กู้ตรวจสอบข้อมูลเครดิต ประวัติการชำระหนี้ และข้อมูลทางการเงินของข้าพเจ้าจากแหล่งข้อมูลต่างๆ รวมถึงสำนักงานข้อมูลเครดิตแห่งชาติ`
        },
        {
          title: "การรับรองความถูกต้องของข้อมูล",
          content: `ข้าพเจ้ารับรองว่าข้อมูลทั้งหมดที่แจ้งให้แก่ผู้ให้กู้เป็นความจริงถูกต้อง หากข้อมูลใดเป็นเท็จ ข้าพเจ้ายินดีรับผิดชอบตามกฎหมาย`
        },
        {
          title: "การยินยอมรับทราบเงื่อนไขดอกเบี้ย",
          content: `ข้าพเจ้าได้รับทราบและเข้าใจเงื่อนไขเกี่ยวกับอัตราดอกเบี้ย ค่าธรรมเนียม และข้อกำหนดการชำระเงินอย่างชัดเจนแล้ว`
        },
        {
          title: "การยินยอมติดต่อสื่อสาร",
          content: `ข้าพเจ้ายินยอมให้ผู้ให้กู้ติดต่อข้าพเจ้าผ่านช่องทางต่างๆ เช่น โทรศัพท์ อีเมล SMS หรือ LINE เพื่อแจ้งเตือนการชำระเงิน หรือข้อมูลสำคัญอื่นๆ`
        }
      ],
      
      // กฎหมายและข้อบังคับที่เกี่ยวข้อง
      legalReferences: [
        "พระราชบัญญัติว่าด้วยการให้เช่าซื้อและการให้เช่าที่มีกำหนดระยะเวลา พ.ศ. 2558",
        "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562", 
        "ประมวลกฎหมายแพ่งและพาณิชย์ บรรพ 3 ลักษณะแห่งหนี้",
        "พระราชบัญญัติว่าด้วยธุรกิจสถาบันการเงิน พ.ศ. 2551",
        "ประกาศธนาคารแห่งประเทศไทย เรื่อง หลักเกณฑ์การคุ้มครองผู้บริโภคด้านบริการทางการเงิน"
      ],
      
      acceptanceText: "ข้าพเจ้าได้อ่านและเข้าใจเงื่อนไขทั้งหมดในสัญญานี้แล้ว และยินยอมผูกพันตามสัญญานี้โดยสมัครใจ",
      signatureDate: new Date().toLocaleDateString("th-TH"),
      effectiveDate: new Date().toLocaleDateString("th-TH"),
      
      // ข้อมูลบริษัท
      lenderInfo: {
        companyName: "บริษัท บ้านทีเค จำกัด",
        address: "123/456 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900",
        phone: "02-123-4567",
        email: "contact@baantk.com",
        registration: "0105561234567",
        license: "ใบอนุญาตประกอบธุรกิจสถาบันการเงิน เลขที่ 12345/2567"
      }
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

  // Convert number to Thai text
  numberToThaiText(number) {
    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const tens = ['', '', 'ยี่', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    if (number === 0) return 'ศูนย์';
    
    let result = '';
    let numStr = number.toString();
    
    for (let i = 0; i < numStr.length; i++) {
      let digit = parseInt(numStr[i]);
      let position = numStr.length - i - 1;
      
      if (digit !== 0) {
        if (position === 1 && digit === 1) {
          result += 'สิบ';
        } else if (position === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (position === 0 && digit === 1 && numStr.length > 1) {
          result += 'เอ็ด';
        } else {
          result += ones[digit] + units[position];
        }
      }
    }
    
    return result + 'บาทถ้วน';
  }

  // Generate contract with borrower data
  async generateContractWithBorrowerData(borrowerId) {
    try {
      const db = admin.firestore();
      const borrowerDoc = await db.collection("borrowers").doc(borrowerId).get();
      
      if (!borrowerDoc.exists) {
        throw new Error(`Borrower not found: ${borrowerId}`);
      }
      
      const borrowerData = borrowerDoc.data();
      
      // Calculate loan terms if not present
      const loanTerms = borrowerData.loanTerms || this.calculateLoanTerms(borrowerData);
      
      // Generate contract
      const contractData = this.generateContract(borrowerData, loanTerms);
      
      // Save contract
      const contractId = await this.saveContract(contractData, borrowerId);
      
      return { contractId, contractData };
    } catch (error) {
      console.error("Error generating contract with borrower data:", error);
      throw error;
    }
  }

  // Calculate loan terms from borrower data
  calculateLoanTerms(borrowerData) {
    const principal = borrowerData.amount || borrowerData.requestedAmount;
    const frequency = borrowerData.frequency;
    
    // Interest rates based on frequency
    const interestRates = {
      daily: 0.2,
      weekly: 0.15, 
      monthly: 0.1
    };
    
    const interestRate = interestRates[frequency] || 0.15;
    const interest = principal * interestRate;
    const totalWithInterest = principal + interest;
    
    // Calculate installments
    let installments, installmentAmount;
    
    switch (frequency) {
      case 'daily':
        installments = 30; // 1 month
        installmentAmount = totalWithInterest / installments;
        break;
      case 'weekly':
        installments = 4; // 1 month
        installmentAmount = totalWithInterest / installments;
        break;
      case 'monthly':
        installments = 1; // 1 month
        installmentAmount = totalWithInterest;
        break;
      default:
        installments = 1;
        installmentAmount = totalWithInterest;
    }
    
    // Due date
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    return {
      principal,
      interestRate,
      interest,
      totalWithInterest,
      installments,
      installmentAmount: Math.round(installmentAmount),
      frequency,
      dueDate
    };
  }

  // Enhanced contract HTML generation for display
  generateContractHTML(contractData) {
    const { terms, borrower, loan } = contractData;
    
    let html = `
      <div class="contract-document">
        <div class="contract-header text-center mb-8">
          <h1 class="text-2xl font-bold mb-2">${terms.title}</h1>
          <p class="text-gray-600">เลขที่สัญญา: ${contractData.contractId}</p>
          <p class="text-gray-600">วันที่ทำสัญญา: ${terms.contractDate}</p>
        </div>
        
        <div class="contract-parties mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="lender-info bg-blue-50 p-4 rounded-lg">
              <h3 class="font-semibold text-blue-900 mb-2">ผู้ให้กู้</h3>
              <p><strong>${terms.lenderInfo.companyName}</strong></p>
              <p class="text-sm">${terms.lenderInfo.address}</p>
              <p class="text-sm">โทร: ${terms.lenderInfo.phone}</p>
              <p class="text-sm">อีเมล: ${terms.lenderInfo.email}</p>
              <p class="text-sm">ใบจดทะเบียน: ${terms.lenderInfo.registration}</p>
            </div>
            
            <div class="borrower-info bg-green-50 p-4 rounded-lg">
              <h3 class="font-semibold text-green-900 mb-2">ผู้กู้</h3>
              <p><strong>${borrower.name}</strong></p>
              <p class="text-sm">เลขบัตรประชาชน: ${borrower.idCard}</p>
              <p class="text-sm">ที่อยู่: ${borrower.address}</p>
            </div>
          </div>
        </div>
        
        <div class="contract-terms space-y-6">
    `;
    
    // Add main clauses
    terms.mainClauses.forEach(clause => {
      html += `
        <div class="clause">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">${clause.section}</h3>
          <div class="subsections space-y-2 ml-4">
      `;
      
      clause.subsections.forEach(subsection => {
        html += `
          <div class="subsection">
            <span class="font-medium text-gray-700">${subsection.number}</span>
            <span class="ml-2">${subsection.content}</span>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    // Add consent clauses
    html += `
        </div>
        
        <div class="consent-section bg-yellow-50 p-6 rounded-lg mt-8">
          <h3 class="text-lg font-semibold text-yellow-900 mb-4">คำยินยอมและการรับรอง</h3>
          <div class="space-y-4">
    `;
    
    terms.consentClauses.forEach((consent, index) => {
      html += `
        <div class="consent-item">
          <h4 class="font-medium text-yellow-800 mb-2">${index + 1}. ${consent.title}</h4>
          <p class="text-sm text-yellow-700 ml-4">${consent.content}</p>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
        
        <div class="legal-references bg-gray-50 p-4 rounded-lg mt-6">
          <h4 class="font-medium text-gray-800 mb-2">กฎหมายและข้อบังคับที่เกี่ยวข้อง:</h4>
          <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
    `;
    
    terms.legalReferences.forEach(ref => {
      html += `<li>${ref}</li>`;
    });
    
    html += `
          </ul>
        </div>
        
        <div class="acceptance-section bg-green-50 p-6 rounded-lg mt-8">
          <p class="text-center font-medium text-green-800">${terms.acceptanceText}</p>
        </div>
        
        <div class="signature-section mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="lender-signature text-center">
            <div class="signature-line border-b-2 border-gray-300 mb-2 h-16"></div>
            <p class="text-sm">( ผู้ให้กู้ )</p>
            <p class="text-xs text-gray-600">วันที่: ${terms.signatureDate}</p>
          </div>
          
          <div class="borrower-signature text-center">
            <div class="signature-line border-b-2 border-gray-300 mb-2 h-16"></div>
            <p class="text-sm">( ผู้กู้ )</p>
            <p class="text-xs text-gray-600">วันที่: ${terms.signatureDate}</p>
          </div>
        </div>
      </div>
    `;
    
    return html;
  }
}

module.exports = new ContractService();
