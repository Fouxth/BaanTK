// 🔍 Script สำหรับตรวจสอบ Firebase Functions Logs
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// ฟังก์ชันดึง logs จาก Firebase Functions
async function getFirebaseLogs(functionName = 'lineWebhook', limit = 50) {
  try {
    console.log(`📋 ดึง logs ของ function: ${functionName}`);
    console.log(`📊 จำนวน: ${limit} บรรทัดล่าสุด`);
    console.log('='.repeat(50));
    
    const command = `firebase functions:log --only ${functionName} --limit ${limit}`;
    console.log(`🔧 Command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: '/Users/pn/Desktop/Fouxth/BaanTK'
    });
    
    if (stderr) {
      console.log('⚠️ Warnings:', stderr);
    }
    
    console.log('📄 Logs:');
    console.log(stdout);
    
    return stdout;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึง logs:', error.message);
    throw error;
  }
}

// ฟังก์ชันตรวจสอบ deployment status
async function checkDeploymentStatus() {
  try {
    console.log('🚀 ตรวจสอบสถานะ deployment...');
    
    const { stdout } = await execAsync('firebase functions:list', {
      cwd: '/Users/pn/Desktop/Fouxth/BaanTK'
    });
    
    console.log('📋 Functions ที่ deploy แล้ว:');
    console.log(stdout);
    
    return stdout;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ deployment:', error.message);
    throw error;
  }
}

// ฟังก์ชันตรวจสอบ config
async function checkFirebaseConfig() {
  try {
    console.log('⚙️ ตรวจสอบ Firebase config...');
    
    const { stdout } = await execAsync('firebase use', {
      cwd: '/Users/pn/Desktop/Fouxth/BaanTK'
    });
    
    console.log('🎯 Active project:');
    console.log(stdout);
    
    return stdout;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ config:', error.message);
    throw error;
  }
}

// ฟังก์ชันติดตาม logs แบบ real-time
async function watchLogs(functionName = 'lineWebhook') {
  try {
    console.log(`👁️ ติดตาม logs แบบ real-time สำหรับ: ${functionName}`);
    console.log('📢 กด Ctrl+C เพื่อหยุด');
    console.log('='.repeat(50));
    
    const command = `firebase functions:log --only ${functionName} --follow`;
    
    const childProcess = exec(command, {
      cwd: '/Users/pn/Desktop/Fouxth/BaanTK'
    });
    
    childProcess.stdout.on('data', (data) => {
      console.log(data);
    });
    
    childProcess.stderr.on('data', (data) => {
      console.error('⚠️', data);
    });
    
    childProcess.on('close', (code) => {
      console.log(`\n📋 การติดตาม logs สิ้นสุด (exit code: ${code})`);
    });
    
    // จัดการ Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n🛑 หยุดการติดตาม logs...');
      childProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการติดตาม logs:', error.message);
    throw error;
  }
}

// ฟังก์ชันหลัก
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'logs';
  
  try {
    console.log('🔍 Firebase Functions Log Checker');
    console.log(`⏰ ${new Date().toLocaleString('th-TH')}`);
    console.log('='.repeat(70));
    
    switch (command) {
      case 'logs':
        await getFirebaseLogs();
        break;
        
      case 'watch':
        await watchLogs();
        break;
        
      case 'status':
        await checkDeploymentStatus();
        break;
        
      case 'config':
        await checkFirebaseConfig();
        break;
        
      case 'all':
        console.log('1️⃣ ตรวจสอบ config...\n');
        await checkFirebaseConfig();
        
        console.log('\n2️⃣ ตรวจสอบ deployment status...\n');
        await checkDeploymentStatus();
        
        console.log('\n3️⃣ ดึง logs...\n');
        await getFirebaseLogs();
        break;
        
      default:
        console.log('📖 วิธีใช้งาน:');
        console.log('  node check-firebase-logs.js [command]');
        console.log('');
        console.log('🔧 Commands:');
        console.log('  logs     - ดึง logs ล่าสุด (default)');
        console.log('  watch    - ติดตาม logs แบบ real-time');
        console.log('  status   - ตรวจสอบสถานะ deployment');
        console.log('  config   - ตรวจสอบ Firebase config');
        console.log('  all      - ตรวจสอบทุกอย่าง');
        break;
    }
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

// เรียกใช้งาน
if (require.main === module) {
  main();
}

module.exports = {
  getFirebaseLogs,
  checkDeploymentStatus,
  checkFirebaseConfig,
  watchLogs
};
