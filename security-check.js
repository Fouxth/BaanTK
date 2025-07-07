#!/usr/bin/env node

/**
 * 🔒 Security Check Script สำหรับ BaanTK
 * ตรวจสอบความปลอดภัยก่อน deploy
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 เริ่มตรวจสอบความปลอดภัย BaanTK...\n');

let hasErrors = false;
let hasWarnings = false;

// รายการข้อมูลลับที่ห้ามมีในโค้ด
const SENSITIVE_PATTERNS = [
  {
    pattern: /htsHzjHcSkA1Xu3Qtf7C/g,
    description: 'LINE Channel Access Token ตัวเก่า',
    severity: 'ERROR'
  },
  {
    pattern: /87fe8316138c02b02a4e20dafde563fd/g,
    description: 'LINE Channel Secret ตัวเก่า',
    severity: 'ERROR'
  },
  {
    pattern: /BaanTK@Admin#2024\$Secure!/g,
    description: 'Admin Token ตัวเก่า',
    severity: 'ERROR'
  },
  {
    pattern: /admin123/g,
    description: 'รหัสผ่าน admin ที่ไม่ปลอดภัย',
    severity: 'ERROR'
  },
  {
    pattern: /password.*=.*["'].*["']/gi,
    description: 'รหัสผ่านที่อาจเขียนตายตัว',
    severity: 'WARNING'
  },
  {
    pattern: /token.*=.*["'][^"']{20,}["']/gi,
    description: 'Token ที่อาจเขียนตายตัว',
    severity: 'WARNING'
  }
];

// ไฟล์ที่ต้องตรวจสอบ
const FILES_TO_CHECK = [
  'functions/index.js',
  'functions/simple.js',
  'functions/line-auto-reply.js',
  'functions/minimal.js',
  'functions/contractService.js',
  'functions/creditScoring.js',
  'functions/governmentAPI.js',
  'functions/security.js',
  'functions/validation.js'
];

// Environment variables ที่จำเป็น
const REQUIRED_ENV_VARS = [
  'CHANNEL_ACCESS_TOKEN',
  'CHANNEL_SECRET',
  'ADMIN_SECRET_TOKEN'
];

/**
 * ตรวจสอบไฟล์แต่ละไฟล์
 */
function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ไฟล์ ${filePath} ไม่พบ - ข้าม`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let fileHasIssues = false;

  console.log(`📄 ตรวจสอบ ${filePath}...`);

  SENSITIVE_PATTERNS.forEach(({ pattern, description, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      fileHasIssues = true;
      
      if (severity === 'ERROR') {
        console.log(`   ❌ ERROR: ${description}`);
        console.log(`      พบ: ${matches[0].substring(0, 20)}...`);
        hasErrors = true;
      } else {
        console.log(`   ⚠️  WARNING: ${description}`);
        console.log(`      พบ: ${matches[0].substring(0, 20)}...`);
        hasWarnings = true;
      }
    }
  });

  if (!fileHasIssues) {
    console.log(`   ✅ ปลอดภัย`);
  }
}

/**
 * ตรวจสอบ environment variables
 */
function checkEnvironmentVariables() {
  console.log('\n🔧 ตรวจสอบ Environment Variables...');
  
  const envExamplePath = 'functions/.env.example';
  const envPath = 'functions/.env';
  
  // ตรวจสอบว่ามีไฟล์ .env.example
  if (!fs.existsSync(envExamplePath)) {
    console.log('❌ ERROR: ไม่พบไฟล์ functions/.env.example');
    hasErrors = true;
    return;
  }

  // ตรวจสอบว่ามีไฟล์ .env สำหรับ development
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  WARNING: ไม่พบไฟล์ functions/.env สำหรับ development');
    console.log('   สร้างไฟล์ด้วยคำสั่ง: cp functions/.env.example functions/.env');
    hasWarnings = true;
  }

  // ตรวจสอบเนื้อหาใน .env.example
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!envExampleContent.includes(varName)) {
      console.log(`❌ ERROR: ไม่พบ ${varName} ใน .env.example`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${varName} พบใน .env.example`);
    }
  });
}

/**
 * ตรวจสอบ .gitignore
 */
function checkGitignore() {
  console.log('\n📝 ตรวจสอบ .gitignore...');
  
  if (!fs.existsSync('.gitignore')) {
    console.log('❌ ERROR: ไม่พบไฟล์ .gitignore');
    hasErrors = true;
    return;
  }

  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  
  const requiredIgnores = ['.env', 'functions/.env', '*.key', '*.pem'];
  
  requiredIgnores.forEach(ignore => {
    if (!gitignoreContent.includes(ignore)) {
      console.log(`❌ ERROR: .gitignore ไม่มี ${ignore}`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${ignore} อยู่ใน .gitignore`);
    }
  });
}

/**
 * ตรวจสอบ CORS configuration
 */
function checkCORSConfiguration() {
  console.log('\n🌐 ตรวจสอบ CORS Configuration...');
  
  const simpleJsPath = 'functions/simple.js';
  if (!fs.existsSync(simpleJsPath)) {
    console.log('⚠️  ไฟล์ simple.js ไม่พบ - ข้าม');
    return;
  }

  const content = fs.readFileSync(simpleJsPath, 'utf8');
  
  // ตรวจสอบว่ามีการตรวจสอบ NODE_ENV
  if (content.includes('process.env.NODE_ENV === "production"')) {
    console.log('   ✅ มีการตรวจสอบ production mode สำหรับ CORS');
  } else {
    console.log('⚠️  WARNING: ไม่พบการตรวจสอบ production mode สำหรับ CORS');
    hasWarnings = true;
  }
  
  // ตรวจสอบว่าไม่มีการอนุญาต origin ทั้งหมดใน production
  if (content.includes('callback(null, true)') && !content.includes('isProduction')) {
    console.log('⚠️  WARNING: อาจมีการอนุญาต CORS ทั้งหมดใน production');
    hasWarnings = true;
  }
}

/**
 * แสดงสรุปผลการตรวจสอบ
 */
function showSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 สรุปผลการตรวจสอบความปลอดภัย');
  console.log('='.repeat(50));
  
  if (hasErrors) {
    console.log('❌ พบข้อผิดพลาดร้ายแรง - ห้าม deploy!');
    console.log('   กรุณาแก้ไขปัญหาทั้งหมดก่อน deploy');
  } else if (hasWarnings) {
    console.log('⚠️  พบข้อควรระวัง - แนะนำให้แก้ไขก่อน deploy');
    console.log('   สามารถ deploy ได้ แต่ควรแก้ไขเพื่อความปลอดภัย');
  } else {
    console.log('✅ ผ่านการตรวจสอบความปลอดภัยทั้งหมด!');
    console.log('   พร้อม deploy ได้');
  }
  
  console.log('\n📚 อ่านเพิ่มเติม: SECURITY.md');
  console.log('='.repeat(50));
}

// เริ่มการตรวจสอบ
console.log('🔍 ตรวจสอบไฟล์โค้ด...');
FILES_TO_CHECK.forEach(checkFile);

checkEnvironmentVariables();
checkGitignore();
checkCORSConfiguration();
showSummary();

// Exit code
process.exit(hasErrors ? 1 : 0);