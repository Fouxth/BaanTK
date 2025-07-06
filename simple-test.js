// Simple System Test for BaanTK
const axios = require('axios');

// Configuration
const config = {
    baseURL: 'https://us-central1-baan-tk.cloudfunctions.net/webhook',
    adminToken: 'admin123',
    timeout: 5000
};

// Test functions
async function testBasicConnectivity() {
    console.log('🌐 Testing Basic Connectivity...');
    
    try {
        const response = await axios.get('https://httpbin.org/get', { 
            timeout: config.timeout 
        });
        console.log('✅ Internet Connection: OK');
        return true;
    } catch (error) {
        console.log('❌ Internet Connection: Failed');
        console.log('Error:', error.message);
        return false;
    }
}

async function testFirebaseFunctions() {
    console.log('🔥 Testing Firebase Functions...');
    
    try {
        const response = await axios.get(`${config.baseURL}/`, { 
            timeout: config.timeout 
        });
        console.log('✅ Firebase Functions: OK');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Firebase Functions: Failed');
        console.log('Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status || 'No response');
        return false;
    }
}

async function testHealthEndpoint() {
    console.log('🏥 Testing Health Endpoint...');
    
    try {
        const response = await axios.get(`${config.baseURL}/api/health`, { 
            timeout: config.timeout 
        });
        console.log('✅ Health Endpoint: OK');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Health Endpoint: Failed');
        console.log('Error:', error.response?.data || error.message);
        return false;
    }
}

async function testAdminLogin() {
    console.log('🔐 Testing Admin Authentication...');
    
    try {
        const response = await axios.post(`${config.baseURL}/api/admin/dashboard-stats`, {}, {
            headers: {
                'Authorization': `Bearer ${config.adminToken}`,
                'Content-Type': 'application/json'
            },
            timeout: config.timeout
        });
        console.log('✅ Admin Authentication: OK');
        return true;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('⚠️ Admin Authentication: Unauthorized (expected if not deployed)');
        } else {
            console.log('❌ Admin Authentication: Failed');
            console.log('Error:', error.response?.data || error.message);
        }
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting BaanTK System Tests...\n');
    
    const tests = [
        testBasicConnectivity,
        testFirebaseFunctions,
        testHealthEndpoint,
        testAdminLogin
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test();
            if (result) passed++;
            else failed++;
        } catch (error) {
            console.log('❌ Test crashed:', error.message);
            failed++;
        }
        console.log(''); // Add spacing
    }
    
    console.log('📊 Test Results Summary:');
    console.log(`Total Tests: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('⚠️ Some tests failed. Check the logs above for details.');
        
        if (failed === tests.length) {
            console.log('\n💡 Tips:');
            console.log('1. Make sure you have deployed the functions: npm run deploy');
            console.log('2. Check your internet connection');
            console.log('3. Verify the Firebase project ID in firebase.json');
            console.log('4. Make sure the .env file is configured correctly');
        }
    }
}

// Run tests
runTests().catch(console.error);
