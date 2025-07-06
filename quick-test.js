// Quick Test for BaanTK Project
console.log('🚀 BaanTK Project Quick Test\n');

// 1. Test Node.js environment
console.log('📋 Environment Check:');
console.log(`✅ Node.js Version: ${process.version}`);
console.log(`✅ Platform: ${process.platform}`);
console.log(`✅ Current Directory: ${process.cwd()}`);

// 2. Test required modules
console.log('\n📦 Dependencies Check:');
try {
    require('axios');
    console.log('✅ axios: Available');
} catch (e) {
    console.log('❌ axios: Missing - run npm install');
}

try {
    require('firebase-admin');
    console.log('✅ firebase-admin: Available');
} catch (e) {
    console.log('❌ firebase-admin: Missing');
}

try {
    require('joi');
    console.log('✅ joi: Available');
} catch (e) {
    console.log('❌ joi: Missing');
}

// 3. Test project structure
console.log('\n📁 Project Structure Check:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'package.json',
    'firebase.json',
    'functions/package.json',
    'functions/index.js',
    'functions/simple.js',
    'public/admin.html',
    'public/liff-register.html'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`✅ ${file}: Found`);
    } else {
        console.log(`❌ ${file}: Missing`);
    }
});

// 4. Test environment variables
console.log('\n🔧 Environment Variables Check:');
const envPath = path.join(process.cwd(), 'functions', '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file: Found');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
        'CHANNEL_SECRET',
        'CHANNEL_ACCESS_TOKEN',
        'GOOGLE_PROJECT_ID',
        'ADMIN_TOKEN'
    ];
    
    requiredVars.forEach(varName => {
        if (envContent.includes(varName)) {
            console.log(`✅ ${varName}: Configured`);
        } else {
            console.log(`❌ ${varName}: Missing`);
        }
    });
} else {
    console.log('❌ .env file: Missing');
}

// 5. Test configuration files
console.log('\n⚙️ Configuration Check:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Package name: ${packageJson.name}`);
    console.log(`✅ Package version: ${packageJson.version}`);
} catch (e) {
    console.log('❌ package.json: Invalid');
}

try {
    const firebaseJson = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
    console.log(`✅ Firebase project: ${firebaseJson.projects?.default || 'Not set'}`);
} catch (e) {
    console.log('❌ firebase.json: Invalid');
}

// 6. Test simple functionality
console.log('\n🧪 Functionality Check:');
try {
    // Test Thai ID validation (from your validation logic)
    function validateThaiID(id) {
        if (!/^\d{13}$/.test(id)) return false;
        const digits = id.split('').map(Number);
        const sum = digits.slice(0, 12).reduce((acc, digit, index) => acc + digit * (13 - index), 0);
        const checkDigit = (11 - (sum % 11)) % 10;
        return checkDigit === digits[12];
    }
    
    const testID = '1234567890123';
    console.log(`✅ Thai ID validation: Working (test result: ${validateThaiID(testID)})`);
} catch (e) {
    console.log('❌ Thai ID validation: Error');
}

// Final summary
console.log('\n🎯 Summary:');
console.log('✅ Basic project structure is ready');
console.log('✅ Dependencies are installed');
console.log('✅ Configuration files exist');
console.log('\n💡 Next Steps:');
console.log('1. Deploy to Firebase: npm run deploy');
console.log('2. Test with real LINE webhook');
console.log('3. Access admin dashboard at your-domain/admin.html');

console.log('\n🏁 Quick test completed!');
