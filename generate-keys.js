// Generate Random Keys for BaanTK
const crypto = require('crypto');

console.log('🔐 Generating Random Keys for BaanTK\n');

// Generate JWT Secret (64 characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// Generate Encryption Key (64 characters)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY=' + encryptionKey);

// Generate Admin Token (simple)
const adminToken = 'admin_' + crypto.randomBytes(8).toString('hex');
console.log('ADMIN_TOKEN=' + adminToken);

console.log('\n✅ Copy these values to your .env file');
console.log('📝 Remember to also get LINE Bot and Firebase credentials!');
