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

      // Debug API endpoints
      if (path === '/api/debug-user-status' || path === '/debug-user-status') {
        console.log('🔍 Debug user status request:', req.body);
        
        const { userId } = req.body;
        if (!userId) {
          return res.status(400).json({ error: 'userId required' });
        }

        try {
          const admin = require("firebase-admin");
          if (!admin.apps.length) {
            admin.initializeApp();
          }
          const db = admin.firestore();

          // ค้นหาข้อมูลใน borrowers collection
          const borrowersSnapshot = await db.collection('borrowers')
            .where('lineUserId', '==', userId)
            .limit(1)
            .get();

          const borrowersSnapshotUserId = await db.collection('borrowers')
            .where('userId', '==', userId)
            .limit(1)
            .get();

          return res.status(200).json({
            success: true,
            userId: userId,
            timestamp: new Date().toISOString(),
            searches: {
              byLineUserId: {
                found: !borrowersSnapshot.empty,
                count: borrowersSnapshot.size,
                data: borrowersSnapshot.empty ? null : borrowersSnapshot.docs[0].data()
              },
              byUserId: {
                found: !borrowersSnapshotUserId.empty,
                count: borrowersSnapshotUserId.size,
                data: borrowersSnapshotUserId.empty ? null : borrowersSnapshotUserId.docs[0].data()
              }
            }
          });

        } catch (error) {
          console.error('Debug status error:', error);
          return res.status(500).json({ 
            error: error.message,
            userId: userId
          });
        }
      }

      if (path === '/api/test-registration' || path === '/test-registration') {
        console.log('🔍 Test registration request:', req.body);
        
        return res.status(200).json({
          success: true,
          message: 'This is a test endpoint - registration would be processed here',
          receivedData: req.body,
          timestamp: new Date().toISOString()
        });
      }

      // Fix existing borrowers endpoint
      if (path === '/api/fix-borrowers' || path === '/fix-borrowers') {
        // Simple admin authentication
        const token = req.headers.authorization?.replace('Bearer ', '');
        const adminTokens = [
          process.env.ADMIN_SECRET_TOKEN,
          'admin123',
          'baantk-admin-2024', 
          'demo123'
        ].filter(Boolean);
        
        if (!token || !adminTokens.includes(token)) {
          return res.status(401).json({ error: 'Unauthorized - Admin access required' });
        }

        try {
          console.log('🔧 Starting borrower record fix...');
          
          const admin = require("firebase-admin");
          if (!admin.apps.length) {
            admin.initializeApp();
          }
          const db = admin.firestore();

          // Get all borrowers
          const borrowersSnapshot = await db.collection('borrowers').get();
          
          if (borrowersSnapshot.empty) {
            return res.status(200).json({
              success: true,
              message: 'No borrowers found in database',
              stats: { total: 0, updated: 0, skipped: 0 }
            });
          }

          const batch = db.batch();
          let updateCount = 0;
          let skipCount = 0;
          const updateDetails = [];

          // Process each document
          borrowersSnapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;
            
            if (data.userId && !data.lineUserId) {
              batch.update(doc.ref, { 
                lineUserId: data.userId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                fixedLineUserId: true
              });
              
              updateDetails.push({
                id: docId,
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                userId: data.userId?.substring(0, 10) + '...',
                action: 'added_lineUserId'
              });
              
              updateCount++;
            } else {
              skipCount++;
            }
          });

          // Execute batch update
          if (updateCount > 0) {
            await batch.commit();
          }

          const stats = {
            total: borrowersSnapshot.size,
            updated: updateCount,
            skipped: skipCount,
            updateDetails: updateDetails.slice(0, 10) // Show first 10 updates
          };

          console.log('✅ Borrower fix completed:', stats);

          return res.status(200).json({
            success: true,
            message: `Successfully updated ${updateCount} borrower records`,
            stats: stats
          });

        } catch (error) {
          console.error('❌ Fix borrowers error:', error);
          return res.status(500).json({ 
            error: error.message,
            message: 'Failed to fix borrower records'
          });
        }
      }

      // List all borrowers for debugging
      if (path === '/api/list-borrowers' || path === '/list-borrowers') {
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

        try {
          const admin = require("firebase-admin");
          if (!admin.apps.length) {
            admin.initializeApp();
          }
          const db = admin.firestore();

          const borrowersSnapshot = await db.collection('borrowers').limit(10).get();
          
          const borrowers = borrowersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              lineUserId: data.lineUserId,
              firstName: data.firstName,
              lastName: data.lastName,
              status: data.status,
              hasUserIdField: !!data.userId,
              hasLineUserIdField: !!data.lineUserId,
              userIdLength: data.userId?.length || 0,
              lineUserIdLength: data.lineUserId?.length || 0
            };
          });

          return res.status(200).json({
            success: true,
            count: borrowers.length,
            borrowers: borrowers
          });

        } catch (error) {
          console.error('List borrowers error:', error);
          return res.status(500).json({ 
            error: error.message
          });
        }
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