#!/usr/bin/env node

/**
 * Docker Authentication Test Script
 * 
 * This script helps verify that the Docker mock authentication is working correctly.
 * Run this script to test the authentication flow without manually clicking buttons.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'Docker-Auth-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testAuthentication() {
  console.log('🔍 Testing Docker Authentication Setup...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const serverTest = await makeRequest('/');
    console.log(`   ✅ Server responding (Status: ${serverTest.statusCode})\n`);

    // Test 2: Check authentication status
    console.log('2. Testing authentication status...');
    const authTest = await makeRequest('/api/auth/user');
    console.log(`   📋 Auth status: ${authTest.statusCode}`);
    if (authTest.statusCode === 401) {
      console.log('   ℹ️  Not authenticated (expected for fresh session)\n');
    } else {
      console.log('   ✅ Already authenticated\n');
    }

    // Test 3: Attempt mock login
    console.log('3. Testing mock authentication...');
    const loginTest = await makeRequest('/api/login');
    console.log(`   📋 Login response: ${loginTest.statusCode}`);
    
    if (loginTest.statusCode === 302) {
      console.log('   ✅ Mock login successful (redirected)');
      console.log(`   📍 Redirect location: ${loginTest.headers.location || 'Not specified'}\n`);
    } else if (loginTest.statusCode === 500) {
      console.log('   ❌ Mock login failed - server error');
      console.log(`   📋 Error details: ${loginTest.body.substring(0, 200)}...\n`);
    } else {
      console.log(`   ⚠️  Unexpected response: ${loginTest.statusCode}\n`);
    }

    // Test 4: Verify authentication worked
    console.log('4. Verifying authentication state...');
    const finalAuthTest = await makeRequest('/api/auth/user');
    console.log(`   📋 Final auth status: ${finalAuthTest.statusCode}`);
    
    if (finalAuthTest.statusCode === 200) {
      console.log('   ✅ Authentication successful!');
      try {
        const userData = JSON.parse(finalAuthTest.body);
        console.log(`   👤 User: ${userData.firstName} ${userData.lastName} (${userData.email})`);
      } catch (e) {
        console.log('   📋 User data received (parsing failed)');
      }
    } else {
      console.log('   ❌ Authentication failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Ensure Docker container is running: docker compose up -d');
    console.log('   2. Check logs: docker compose logs app');
    console.log('   3. Verify MOCK_AUTH=true in docker-compose.yml');
    console.log('   4. Check port 3000 is accessible');
  }
}

if (require.main === module) {
  testAuthentication();
}

module.exports = { testAuthentication };