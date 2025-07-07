// 🚀 BaanTK Main Entry Point
// This file serves as the main entry point for all Firebase Functions

// Load environment variables first
require('dotenv').config();
const { onRequest } = require("firebase-functions/v2/https");

console.log("🚀 Loading BaanTK Functions...");

// Import and export the main webhook function from simple.js
const simpleWebhook = require('./simple');

// Export the webhook function with proper invoker settings
exports.webhook = onRequest(
  {
    cors: true,
    invoker: "public" // Allow public access for LINE webhook
  },
  simpleWebhook.webhook
);

// Admin API for token verification and admin operations
exports.adminApi = onRequest(
  {
    cors: true,
    invoker: "public"
  },
  async (req, res) => {
    // Handle CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    try {
      const path = req.path || req.url;
      
      // Admin token verification
      if (path === '/api/admin/verify-token' || path === '/verify-token') {
        const token = req.body?.token || req.headers.authorization?.replace('Bearer ', '');
        const adminTokens = [
          process.env.ADMIN_SECRET_TOKEN, // จาก .env
          'admin123',
          'baantk-admin-2024',
          'demo123'
        ].filter(Boolean);

        console.log('🔍 Token verification attempt:', { 
          receivedToken: token ? token.substring(0, 5) + '...' : 'none',
          validTokensCount: adminTokens.length 
        });

        if (adminTokens.includes(token)) {
          console.log('✅ Token verification successful');
          return res.status(200).json({ 
            success: true, 
            message: 'Token valid',
            role: 'admin'
          });
        } else {
          console.log('❌ Token verification failed');
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid admin token' 
          });
        }
      }

      // Admin dashboard data API
      if (path === '/api/admin/dashboard' || path === '/dashboard') {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const adminTokens = [
          process.env.ADMIN_SECRET_TOKEN,
          'admin123',
          'baantk-admin-2024', 
          'demo123'
        ].filter(Boolean);
        
        // Simple token check
        if (!token || !adminTokens.includes(token)) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.status(200).json({
          message: 'Admin dashboard access granted',
          timestamp: new Date().toISOString()
        });
      }

      // Slip approval API
      if (path === '/api/admin/approve-slip' || path === '/approve-slip') {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const adminTokens = [
          process.env.ADMIN_SECRET_TOKEN,
          'admin123',
          'baantk-admin-2024', 
          'demo123'
        ].filter(Boolean);
        
        if (!token || !adminTokens.includes(token)) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { handleSlipApproval } = require('./routes/slipApproval');
        return await handleSlipApproval(req, res);
      }

      // Application approval API
      if (path === '/api/admin/approve-application' || path === '/approve-application') {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const adminTokens = [
          process.env.ADMIN_SECRET_TOKEN,
          'admin123',
          'baantk-admin-2024', 
          'demo123'
        ].filter(Boolean);
        
        if (!token || !adminTokens.includes(token)) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { handleApplicationApproval } = require('./routes/slipApproval');
        return await handleApplicationApproval(req, res);
      }

      // Default response
      res.status(404).json({ error: 'API endpoint not found' });
      
    } catch (error) {
      console.error('Admin API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

console.log("✅ BaanTK Functions loaded successfully");