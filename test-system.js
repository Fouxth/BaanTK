// BaanTK System Test Suite
// Run: node test-system.js

const axios = require('axios');
const colors = require('colors');

// Configuration
const config = {
    baseURL: 'http://localhost:5001/baan-tk/us-central1/webhook',
    adminToken: 'admin123',
    timeout: 30000
};

// Test data
const testData = {
    validRegistration: {
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        birthDate: '15/05/1990',
        idCard: '1234567890123',
        address: '123 ถ.สุขุมวิท เขตวัฒนา กรุงเทพฯ 10110',
        amount: 5000,
        frequency: 'monthly',
        userId: 'U1234567890abcdef1234567890abcdef',
        phoneNumber: '0812345678',
        email: 'test@example.com'
    },
    invalidRegistration: {
        firstName: 'A',
        lastName: 'B',
        birthDate: '32/13/2025',
        idCard: '123',
        address: 'Short',
        amount: 100000,
        frequency: 'invalid',
        userId: 'short'
    }
};

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
        info: 'white',
        success: 'green',
        error: 'red',
        warning: 'yellow'
    };
    console.log(`[${timestamp}] ${message}`[colorMap[type]]);
}

function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
        results.passed++;
        log(`✅ ${name}`, 'success');
    } else {
        results.failed++;
        log(`❌ ${name}: ${details}`, 'error');
    }
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const response = await axios({
            method,
            url: `${config.baseURL}${endpoint}`,
            data,
            headers,
            timeout: config.timeout
        });
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message, 
            status: error.response?.status || 500 
        };
    }
}

// Test suites
async function testHealthCheck() {
    log('🏥 Testing Health Check...', 'info');
    
    const response = await makeRequest('GET', '/');
    recordTest(
        'Health Check',
        response.success && response.data.status === 'OK',
        response.success ? '' : response.error
    );
    
    return response.success;
}

async function testRegistration() {
    log('📝 Testing Registration Flow...', 'info');
    
    // Test valid registration
    const validResponse = await makeRequest('POST', '/api/liff-register', testData.validRegistration);
    recordTest(
        'Valid Registration',
        validResponse.success && validResponse.data.success,
        validResponse.success ? '' : validResponse.error
    );
    
    // Test invalid registration
    const invalidResponse = await makeRequest('POST', '/api/liff-register', testData.invalidRegistration);
    recordTest(
        'Invalid Registration Rejection',
        !invalidResponse.success && invalidResponse.status === 400,
        invalidResponse.success ? 'Should have failed' : 'Correctly rejected'
    );
    
    // Test rate limiting
    log('🚦 Testing Rate Limiting...', 'info');
    const rateLimitPromises = [];
    for (let i = 0; i < 5; i++) {
        rateLimitPromises.push(makeRequest('POST', '/api/liff-register', testData.validRegistration));
    }
    
    const rateLimitResults = await Promise.all(rateLimitPromises);
    const rateLimitTriggered = rateLimitResults.some(r => r.status === 429);
    recordTest(
        'Rate Limiting',
        rateLimitTriggered,
        rateLimitTriggered ? 'Rate limiting working' : 'Rate limiting not triggered'
    );
    
    return validResponse.success;
}

async function testAdminAuthentication() {
    log('🔐 Testing Admin Authentication...', 'info');
    
    // Test admin login
    const loginResponse = await makeRequest('POST', '/api/admin/login', { token: config.adminToken });
    recordTest(
        'Admin Login',
        loginResponse.success && loginResponse.data.success,
        loginResponse.success ? '' : loginResponse.error
    );
    
    if (!loginResponse.success) {
        return null;
    }
    
    const token = loginResponse.data.token;
    
    // Test authenticated request
    const authResponse = await makeRequest('GET', '/api/admin/borrowers', null, {
        Authorization: `Bearer ${token}`
    });
    recordTest(
        'Authenticated Request',
        authResponse.success,
        authResponse.success ? '' : authResponse.error
    );
    
    // Test unauthorized request
    const unauthResponse = await makeRequest('GET', '/api/admin/borrowers', null, {
        Authorization: 'Bearer invalid-token'
    });
    recordTest(
        'Unauthorized Request Rejection',
        !unauthResponse.success && unauthResponse.status === 401,
        unauthResponse.success ? 'Should have failed' : 'Correctly rejected'
    );
    
    return token;
}

async function testAdminFunctions(token) {
    if (!token) {
        log('⚠️ Skipping admin function tests (no token)', 'warning');
        return;
    }
    
    log('👨‍💼 Testing Admin Functions...', 'info');
    
    const authHeaders = { Authorization: `Bearer ${token}` };
    
    // Test dashboard stats
    const statsResponse = await makeRequest('GET', '/api/admin/dashboard-stats', null, authHeaders);
    recordTest(
        'Dashboard Statistics',
        statsResponse.success && statsResponse.data.success,
        statsResponse.success ? '' : statsResponse.error
    );
    
    // Test borrower list
    const borrowersResponse = await makeRequest('GET', '/api/admin/borrowers', null, authHeaders);
    recordTest(
        'Borrower List',
        borrowersResponse.success && borrowersResponse.data.success,
        borrowersResponse.success ? '' : borrowersResponse.error
    );
    
    // Test blacklist
    const blacklistResponse = await makeRequest('GET', '/api/admin/blacklist', null, authHeaders);
    recordTest(
        'Blacklist Access',
        blacklistResponse.success && blacklistResponse.data.success,
        blacklistResponse.success ? '' : blacklistResponse.error
    );
    
    // Test logs
    const logsResponse = await makeRequest('GET', '/api/admin/logs', null, authHeaders);
    recordTest(
        'Admin Logs',
        logsResponse.success && logsResponse.data.success,
        logsResponse.success ? '' : logsResponse.error
    );
}

async function testSecurity() {
    log('🔒 Testing Security Features...', 'info');
    
    // Test SQL injection attempt
    const sqlInjection = await makeRequest('POST', '/api/liff-register', {
        ...testData.validRegistration,
        firstName: "'; DROP TABLE users; --"
    });
    recordTest(
        'SQL Injection Protection',
        !sqlInjection.success || !sqlInjection.data.success,
        'Input sanitization working'
    );
    
    // Test XSS attempt
    const xssAttempt = await makeRequest('POST', '/api/liff-register', {
        ...testData.validRegistration,
        firstName: '<script>alert("XSS")</script>'
    });
    recordTest(
        'XSS Protection',
        !xssAttempt.success || !xssAttempt.data.success,
        'XSS prevention working'
    );
    
    // Test malformed JSON
    const malformedResponse = await makeRequest('POST', '/api/liff-register', 'invalid-json');
    recordTest(
        'Malformed JSON Handling',
        !malformedResponse.success && malformedResponse.status >= 400,
        'Correctly rejected malformed JSON'
    );
}

async function testPerformance() {
    log('⚡ Testing Performance...', 'info');
    
    const startTime = Date.now();
    const response = await makeRequest('GET', '/');
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    recordTest(
        'Response Time',
        responseTime < 5000,
        `Response time: ${responseTime}ms`
    );
    
    // Test concurrent requests
    const concurrentRequests = 10;
    const concurrentPromises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
        concurrentPromises.push(makeRequest('GET', '/'));
    }
    
    const concurrentStart = Date.now();
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentEnd = Date.now();
    
    const successfulRequests = concurrentResults.filter(r => r.success).length;
    recordTest(
        'Concurrent Request Handling',
        successfulRequests >= concurrentRequests * 0.8,
        `${successfulRequests}/${concurrentRequests} requests successful`
    );
    
    recordTest(
        'Concurrent Performance',
        (concurrentEnd - concurrentStart) < 10000,
        `Concurrent requests completed in ${concurrentEnd - concurrentStart}ms`
    );
}

// Main test runner
async function runTests() {
    log('🚀 Starting BaanTK System Tests...', 'info');
    log(`Base URL: ${config.baseURL}`, 'info');
    
    try {
        // Run test suites
        await testHealthCheck();
        await testRegistration();
        const token = await testAdminAuthentication();
        await testAdminFunctions(token);
        await testSecurity();
        await testPerformance();
        
        // Generate report
        log('\n📊 Test Results Summary:', 'info');
        log(`Total Tests: ${results.tests.length}`, 'info');
        log(`Passed: ${results.passed}`, 'success');
        log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
        
        const passRate = ((results.passed / results.tests.length) * 100).toFixed(1);
        log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'success' : 'error');
        
        if (results.failed > 0) {
            log('\n❌ Failed Tests:', 'error');
            results.tests.filter(t => !t.passed).forEach(test => {
                log(`  - ${test.name}: ${test.details}`, 'error');
            });
        }
        
        log('\n🎯 Test Complete!', 'success');
        
        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        log(`🔥 Test Suite Error: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    testHealthCheck,
    testRegistration,
    testAdminAuthentication,
    testAdminFunctions,
    testSecurity,
    testPerformance
};
