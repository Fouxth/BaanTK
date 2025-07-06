const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all domains
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'BaanTK Webhook is working!',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// LIFF registration endpoint
app.post('/api/liff-register', (req, res) => {
  console.log('📝 LIFF Registration received:', req.body);
  
  try {
    const { firstName, lastName, idCard, userId } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || !idCard) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Success response
    res.status(200).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ! ระบบจะแจ้งผลการพิจารณาภายใน 24 ชั่วโมง',
      data: {
        applicationId: 'APP' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'pending'
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// LINE webhook
app.post('/webhook', (req, res) => {
  console.log('📩 LINE Webhook received:', req.body);
  res.status(200).json({ status: 'OK' });
});

// Export function
exports.webhook = functions.https.onRequest(app);

console.log('✅ Minimal webhook function loaded');
