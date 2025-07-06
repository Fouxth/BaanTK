const fs = require('fs');
const path = require('path');

// ไฟล์ที่จะแก้ไข
const filesToFix = [
  'functions/validation.js',
  'functions/utils/storage.js',
  'functions/uploadToStorage.js',
  'functions/statusFlex.js',
  'functions/menuFlex.js',
  'functions/utils/dataManager.js'
];

function fixFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // แก้ไข single quotes เป็น double quotes
    content = content.replace(/'/g, '"');
    
    // แก้ไข indentation (เปลี่ยนจาก 4 spaces เป็น 2 spaces)
    content = content.replace(/^    /gm, '  ');
    content = content.replace(/^      /gm, '    ');
    content = content.replace(/^        /gm, '      ');
    content = content.replace(/^          /gm, '        ');
    content = content.replace(/^            /gm, '          ');
    content = content.replace(/^              /gm, '            ');
    content = content.replace(/^                /gm, '              ');
    content = content.replace(/^                  /gm, '                ');
    content = content.replace(/^                    /gm, '                  ');
    content = content.replace(/^                      /gm, '                    ');
    
    // ลบ trailing spaces
    content = content.replace(/[ \t]+$/gm, '');
    
    // เพิ่ม newline ที่ท้ายไฟล์
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    // แก้ไข trailing comma
    content = content.replace(/,\s*\n\s*}/g, '\n}');
    content = content.replace(/,\s*\n\s*\]/g, '\n]');
    
    // เพิ่ม parentheses รอบ arrow function arguments
    content = content.replace(/(\w+)\s*=>\s*{/g, '($1) => {');
    content = content.replace(/\(\((\w+)\)\)\s*=>\s*{/g, '($1) => {');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
    
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// แก้ไขทุกไฟล์
filesToFix.forEach(fixFile);

console.log('Lint fixing completed!');
