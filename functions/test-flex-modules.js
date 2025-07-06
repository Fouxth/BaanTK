// Test script to verify menuFlex and flexRegisterTemplate structure
const menuFlex = require('./menuFlex');
const flexRegisterTemplate = require('./flexRegisterTemplate');

console.log('🔍 Testing menuFlex structure...');
console.log('Type:', typeof menuFlex);
console.log('Has type property:', menuFlex.hasOwnProperty('type'));
console.log('Has contents property:', menuFlex.hasOwnProperty('contents'));
console.log('Has altText property:', menuFlex.hasOwnProperty('altText'));

console.log('\n🔍 Testing flexRegisterTemplate structure...');
console.log('Type:', typeof flexRegisterTemplate);
console.log('Has type property:', flexRegisterTemplate.hasOwnProperty('type'));
console.log('Has altText property:', flexRegisterTemplate.hasOwnProperty('altText'));

console.log('\n✅ Both modules loaded successfully!');
console.log('menuFlex structure:', JSON.stringify(menuFlex, null, 2));
console.log('flexRegisterTemplate structure:', JSON.stringify(flexRegisterTemplate, null, 2));
