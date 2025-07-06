// Government API Integration Module
// เชื่อมต่อกับ API ของหน่วยงานราชการเพื่อดึงข้อมูลประชาชน

const axios = require('axios');
const admin = require('firebase-admin');

class GovernmentAPIService {
  constructor() {
    // Government API configurations
    this.dopa_api_key = process.env.DOPA_API_KEY; // API Key ของกรมการปกครอง
    this.dopa_base_url = process.env.DOPA_BASE_URL || 'https://dopa.go.th/api/v1';
    
    // Alternative Government APIs
    this.nso_api_key = process.env.NSO_API_KEY; // สำนักงานสถิติแห่งชาติ
    this.nso_base_url = process.env.NSO_BASE_URL || 'https://nso.go.th/api/v1';
    
    // Ministry of Digital Economy and Society APIs
    this.mdes_api_key = process.env.MDES_API_KEY;
    this.mdes_base_url = process.env.MDES_BASE_URL || 'https://mdes.go.th/api/v1';
    
    // Timeout configuration
    this.api_timeout = parseInt(process.env.GOV_API_TIMEOUT) || 10000;
    
    // Rate limiting
    this.rate_limit = {
      requests_per_minute: 60,
      requests_per_hour: 1000
    };
  }

  /**
   * ดึงข้อมูลประชาชนจาก API กรมการปกครอง
   * @param {string} idCard - เลขบัตรประชาชน 13 หลัก
   * @returns {Object} ข้อมูลประชาชน
   */
  async getCitizenDataFromDOPA(idCard) {
    try {
      console.log(`🏛️ Fetching citizen data from DOPA for ID: ${idCard}`);
      
      // Validate ID card format
      if (!this.validateThaiIDCard(idCard)) {
        throw new Error('Invalid Thai ID card format');
      }

      const response = await axios({
        method: 'POST',
        url: `${this.dopa_base_url}/citizen/verify`,
        headers: {
          'Authorization': `Bearer ${this.dopa_api_key}`,
          'Content-Type': 'application/json',
          'X-Request-ID': this.generateRequestId()
        },
        data: {
          id_card: idCard,
          request_type: 'full_profile',
          include_address: true,
          include_family: false // ไม่ต้องการข้อมูลครอบครัว
        },
        timeout: this.api_timeout
      });

      if (response.data.status === 'success' && response.data.data) {
        const citizenData = this.formatDOPAResponse(response.data.data);
        
        // Log successful retrieval
        await this.logAPIUsage('DOPA', 'citizen_verify', 'success', {
          idCard: this.maskIDCard(idCard),
          responseTime: response.headers['x-response-time']
        });

        return {
          success: true,
          source: 'DOPA',
          data: citizenData,
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('No data found or invalid response from DOPA');

    } catch (error) {
      console.error('❌ Error fetching data from DOPA:', error.message);
      
      // Log failed attempt
      await this.logAPIUsage('DOPA', 'citizen_verify', 'error', {
        idCard: this.maskIDCard(idCard),
        error: error.message
      });

      return {
        success: false,
        source: 'DOPA',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ดึงข้อมูลจากทะเบียนราษฎร์ผ่าน NSO API
   * @param {string} idCard - เลขบัตรประชาชน
   * @returns {Object} ข้อมูลทะเบียนราษฎร์
   */
  async getCitizenDataFromNSO(idCard) {
    try {
      console.log(`📊 Fetching citizen data from NSO for ID: ${idCard}`);

      const response = await axios({
        method: 'GET',
        url: `${this.nso_base_url}/population/citizen/${idCard}`,
        headers: {
          'Authorization': `API-Key ${this.nso_api_key}`,
          'Accept': 'application/json'
        },
        timeout: this.api_timeout
      });

      if (response.data.success && response.data.citizen) {
        const citizenData = this.formatNSOResponse(response.data.citizen);
        
        await this.logAPIUsage('NSO', 'population_lookup', 'success', {
          idCard: this.maskIDCard(idCard)
        });

        return {
          success: true,
          source: 'NSO',
          data: citizenData,
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('Citizen not found in NSO database');

    } catch (error) {
      console.error('❌ Error fetching data from NSO:', error.message);
      
      await this.logAPIUsage('NSO', 'population_lookup', 'error', {
        idCard: this.maskIDCard(idCard),
        error: error.message
      });

      return {
        success: false,
        source: 'NSO',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ดึงข้อมูลจากหลายแหล่งพร้อมกัน (Fallback strategy)
   * @param {string} idCard - เลขบัตรประชาชน
   * @returns {Object} ข้อมูลรวม
   */
  async getCitizenDataMultiSource(idCard) {
    try {
      console.log(`🔄 Multi-source citizen data lookup for ID: ${idCard}`);

      // ลองดึงจาก DOPA ก่อน (Primary source)
      const dopaResult = await this.getCitizenDataFromDOPA(idCard);
      
      if (dopaResult.success) {
        console.log('✅ Successfully retrieved data from DOPA');
        return dopaResult;
      }

      // ถ้า DOPA ไม่สำเร็จ ลองจาก NSO (Fallback)
      console.log('⚠️ DOPA failed, trying NSO...');
      const nsoResult = await this.getCitizenDataFromNSO(idCard);
      
      if (nsoResult.success) {
        console.log('✅ Successfully retrieved data from NSO');
        return nsoResult;
      }

      // ถ้าทั้งสองไม่สำเร็จ
      console.log('❌ All government APIs failed');
      return {
        success: false,
        error: 'Unable to retrieve citizen data from any government source',
        sources_tried: ['DOPA', 'NSO'],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in multi-source lookup:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * จัดรูปแบบข้อมูลจาก DOPA API
   * @param {Object} dopaData - ข้อมูลจาก DOPA
   * @returns {Object} ข้อมูลที่จัดรูปแบบแล้ว
   */
  formatDOPAResponse(dopaData) {
    return {
      idCard: dopaData.citizen_id,
      titleThai: dopaData.title_th || '',
      titleEnglish: dopaData.title_en || '',
      firstNameThai: dopaData.first_name_th || '',
      firstNameEnglish: dopaData.first_name_en || '',
      lastNameThai: dopaData.last_name_th || '',
      lastNameEnglish: dopaData.last_name_en || '',
      birthDate: this.formatDate(dopaData.birth_date),
      gender: dopaData.gender,
      nationality: dopaData.nationality || 'Thai',
      religion: dopaData.religion || '',
      
      // ที่อยู่ตามทะเบียนบ้าน
      address: {
        houseNumber: dopaData.address?.house_no || '',
        village: dopaData.address?.village || '',
        lane: dopaData.address?.lane || '',
        road: dopaData.address?.road || '',
        subDistrict: dopaData.address?.sub_district || '',
        district: dopaData.address?.district || '',
        province: dopaData.address?.province || '',
        postalCode: dopaData.address?.postal_code || '',
        fullAddress: dopaData.address?.full_address || ''
      },

      // สถานะบัตร
      cardStatus: {
        isActive: dopaData.card_status === 'active',
        expiryDate: this.formatDate(dopaData.card_expiry),
        issueDate: this.formatDate(dopaData.card_issue_date)
      },

      // ข้อมูลเพิ่มเติม
      maritalStatus: dopaData.marital_status || '',
      occupation: dopaData.occupation || '',
      education: dopaData.education_level || '',
      
      // Metadata
      lastUpdated: dopaData.last_updated,
      dataSource: 'DOPA',
      verificationLevel: 'GOVERNMENT_VERIFIED'
    };
  }

  /**
   * จัดรูปแบบข้อมูลจาก NSO API
   * @param {Object} nsoData - ข้อมูลจาก NSO
   * @returns {Object} ข้อมูลที่จัดรูปแบบแล้ว
   */
  formatNSOResponse(nsoData) {
    return {
      idCard: nsoData.id_number,
      firstNameThai: nsoData.name_th?.first || '',
      lastNameThai: nsoData.name_th?.last || '',
      firstNameEnglish: nsoData.name_en?.first || '',
      lastNameEnglish: nsoData.name_en?.last || '',
      birthDate: this.formatDate(nsoData.birth_date),
      gender: nsoData.gender,
      
      // ข้อมูลทางสถิติ
      statisticalData: {
        householdId: nsoData.household_id,
        familySize: nsoData.family_size,
        incomeRange: nsoData.income_range,
        educationLevel: nsoData.education
      },

      address: {
        province: nsoData.address?.province || '',
        district: nsoData.address?.district || '',
        subDistrict: nsoData.address?.sub_district || '',
        postalCode: nsoData.address?.postal_code || ''
      },

      dataSource: 'NSO',
      verificationLevel: 'STATISTICAL_VERIFIED'
    };
  }

  /**
   * ตรวจสอบความถูกต้องของเลขบัตรประชาชน
   * @param {string} idCard - เลขบัตรประชาชน
   * @returns {boolean} ถูกต้องหรือไม่
   */
  validateThaiIDCard(idCard) {
    if (!idCard || idCard.length !== 13) return false;
    
    // ตรวจสอบว่าเป็นตัวเลขทั้งหมด
    if (!/^\d{13}$/.test(idCard)) return false;
    
    // ตรวจสอบ checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(idCard[i]) * (13 - i);
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(idCard[12]);
  }

  /**
   * จัดรูปแบบวันที่
   * @param {string} dateString - วันที่ในรูปแบบต่างๆ
   * @returns {string} วันที่ในรูปแบบ DD/MM/YYYY
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.warn('⚠️ Invalid date format:', dateString);
      return dateString;
    }
  }

  /**
   * ซ่อนเลขบัตรประชาชนเพื่อความปลอดภัย
   * @param {string} idCard - เลขบัตรประชาชน
   * @returns {string} เลขบัตรที่ซ่อนแล้ว
   */
  maskIDCard(idCard) {
    if (!idCard || idCard.length !== 13) return 'INVALID_ID';
    return `${idCard.substr(0, 4)}-xxxx-xxxx-x${idCard.substr(-1)}`;
  }

  /**
   * สร้าง Request ID สำหรับติดตาม
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `GOV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * บันทึกการใช้งาน API
   * @param {string} source - แหล่งข้อมูล
   * @param {string} operation - การดำเนินการ
   * @param {string} status - สถานะ
   * @param {Object} metadata - ข้อมูลเพิ่มเติม
   */
  async logAPIUsage(source, operation, status, metadata = {}) {
    try {
      const db = admin.firestore();
      
      await db.collection('government_api_logs').add({
        source: source,
        operation: operation,
        status: status,
        metadata: metadata,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      });
      
    } catch (error) {
      console.error('❌ Error logging API usage:', error);
    }
  }

  /**
   * ตรวจสอบ Rate Limit
   * @param {string} source - แหล่งข้อมูล
   * @returns {boolean} สามารถเรียก API ได้หรือไม่
   */
  async checkRateLimit(source) {
    try {
      const db = admin.firestore();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentRequests = await db.collection('government_api_logs')
        .where('source', '==', source)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
        .get();
      
      return recentRequests.size < this.rate_limit.requests_per_hour;
      
    } catch (error) {
      console.error('❌ Error checking rate limit:', error);
      return true; // Allow request if check fails
    }
  }

  /**
   * ได้รับสถิติการใช้งาน API
   * @param {string} period - ช่วงเวลา (today, week, month)
   * @returns {Object} สถิติการใช้งาน
   */
  async getAPIUsageStats(period = 'today') {
    try {
      const db = admin.firestore();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default: // today
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
      
      const logs = await db.collection('government_api_logs')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .get();
      
      const stats = {
        total_requests: logs.size,
        successful_requests: 0,
        failed_requests: 0,
        by_source: {},
        by_operation: {}
      };
      
      logs.forEach(doc => {
        const data = doc.data();
        
        if (data.status === 'success') {
          stats.successful_requests++;
        } else {
          stats.failed_requests++;
        }
        
        // Count by source
        stats.by_source[data.source] = (stats.by_source[data.source] || 0) + 1;
        
        // Count by operation
        stats.by_operation[data.operation] = (stats.by_operation[data.operation] || 0) + 1;
      });
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting API usage stats:', error);
      return null;
    }
  }
}

module.exports = new GovernmentAPIService();
