console.log('Testing menuFlex...');
try {
  const menuFlex = require('./menuFlex');
  console.log('✅ menuFlex loaded:', !!menuFlex);
  console.log('Type:', menuFlex.type);
  console.log('Contents length:', menuFlex.contents ? menuFlex.contents.length : 'No contents');
} catch (error) {
  console.error('❌ menuFlex error:', error.message);
}

console.log('\nTesting flexRegisterTemplate...');
try {
  const flexRegisterTemplate = require('./flexRegisterTemplate');
  console.log('✅ flexRegisterTemplate loaded:', !!flexRegisterTemplate);
  console.log('Type:', flexRegisterTemplate.type);
  console.log('Has altText:', !!flexRegisterTemplate.altText);
} catch (error) {
  console.error('❌ flexRegisterTemplate error:', error.message);
}
