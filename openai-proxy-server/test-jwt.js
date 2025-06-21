#!/usr/bin/env node

/**
 * Test script for JWT authentication functionality
 *
 * This script tests the JWT endpoints and verifies the integration
 * Usage: node test-jwt.js
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Simple fetch implementation for Node.js without external dependencies
async function simpleFetch(url, options = {}) {
  const https = await import('https');
  const http = await import('http');
  const { URL } = await import('url');

  const parsedUrl = new URL(url);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testJWTEndpoints() {
  console.log('🔐 Testing JWT Authentication Endpoints');
  console.log('=====================================\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await simpleFetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();

    console.log('   Health check response:');
    console.log(`   - Status: ${healthData.status}`);
    console.log(`   - Has JWT Config: ${healthData.config.hasJWTConfig}`);
    console.log(`   - Has API Key: ${healthData.config.hasCozeApiKey}`);
    console.log(`   - JWT Token Info:`, healthData.jwt);
    console.log();

    if (!healthData.config.hasJWTConfig) {
      console.warn('⚠️  Warning: JWT configuration not found. Please set JWT environment variables.');
      console.log('   Required variables: COZE_JWT_APP_ID, COZE_JWT_KEY_ID, COZE_JWT_AUD, COZE_JWT_PRIVATE_KEY');
      return;
    }

    // Test 2: Get JWT token
    console.log('2. Testing JWT token retrieval...');
    const jwtResponse = await simpleFetch(`${BASE_URL}/get_jwt`);

    if (!jwtResponse.ok) {
      const errorData = await jwtResponse.json();
      console.error('   ❌ Failed to get JWT token:', errorData);
      return;
    }

    const jwtData = await jwtResponse.json();
    console.log('   ✅ JWT token retrieved successfully');
    console.log(`   - Token length: ${jwtData.token.length} characters`);
    console.log(`   - Has token: ${jwtData.info.hasToken}`);
    console.log(`   - Is valid: ${jwtData.info.isValid}`);
    console.log(`   - Expires in: ${jwtData.info.expiresIn} seconds`);
    console.log();

    // Test 3: Test chat completion with JWT
    console.log('3. Testing chat completion with JWT authentication...');
    const chatResponse = await simpleFetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello! This is a test message.' }
        ],
        max_tokens: 50
      })
    });

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json();
      console.error('   ❌ Chat completion failed:', errorData);
    } else {
      const chatData = await chatResponse.json();
      console.log('   ✅ Chat completion successful');
      console.log(`   - Response: ${chatData.choices[0].message.content}`);
      console.log(`   - Model: ${chatData.model}`);
      if (chatData.usage) {
        console.log(`   - Tokens used: ${chatData.usage.total_tokens}`);
      }
    }
    console.log();

    // Test 4: Refresh JWT token
    console.log('4. Testing JWT token refresh...');
    const refreshResponse = await simpleFetch(`${BASE_URL}/refresh_jwt`, {
      method: 'POST'
    });

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.error('   ❌ Failed to refresh JWT token:', errorData);
    } else {
      const refreshData = await refreshResponse.json();
      console.log('   ✅ JWT token refreshed successfully');
      console.log(`   - Token type: ${refreshData.token_type}`);
      console.log(`   - Expires in: ${refreshData.expires_in} seconds`);
    }
    console.log();

    // Test 5: Clear JWT token
    console.log('5. Testing JWT token clearing...');
    const clearResponse = await simpleFetch(`${BASE_URL}/clear_jwt`, {
      method: 'DELETE'
    });

    if (!clearResponse.ok) {
      const errorData = await clearResponse.json();
      console.error('   ❌ Failed to clear JWT token:', errorData);
    } else {
      const clearData = await clearResponse.json();
      console.log('   ✅ JWT token cleared successfully');
      console.log(`   - Message: ${clearData.message}`);
    }
    console.log();

    console.log('🎉 All JWT tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Make sure the server is running on', BASE_URL);
  }
}

// Run tests
testJWTEndpoints();
