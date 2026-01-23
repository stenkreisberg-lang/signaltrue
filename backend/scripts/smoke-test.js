#!/usr/bin/env node
/**
 * Smoke Test Script for SignalTrue Backend
 * Tests all core API endpoints with seeded admin credentials
 */

const BASE_URL = process.env.API_URL || 'http://localhost:8080';

const ENDPOINTS = [
  // Public endpoints
  { method: 'GET', path: '/', expectStatus: 200, desc: 'Root health check' },
  
  // Auth
  { method: 'POST', path: '/api/auth/login', body: { email: 'test-user@example.com', password: 'password123' }, expectStatus: 200, desc: 'Login', saveToken: true },
  
  // Protected endpoints (will use saved token)
  { method: 'GET', path: '/api/auth/me', expectStatus: 200, desc: 'Get current user', auth: true },
  { method: 'GET', path: '/api/teams', expectStatus: 200, desc: 'List teams', auth: true },
  { method: 'GET', path: '/api/signals', expectStatus: [200, 404], desc: 'List signals', auth: true },
  { method: 'GET', path: '/api/interventions', expectStatus: [200, 404], desc: 'List interventions', auth: true },
  { method: 'GET', path: '/api/cost-of-drift/summary', expectStatus: [200, 400], desc: 'Cost of drift summary', auth: true },
  { method: 'GET', path: '/api/bdi', expectStatus: [200, 404], desc: 'BDI index', auth: true },
  { method: 'GET', path: '/api/insights', expectStatus: [200, 404], desc: 'Insights', auth: true },
  { method: 'GET', path: '/api/privacy/transparency-log', expectStatus: [200, 403], desc: 'Privacy transparency log', auth: true },
  { method: 'GET', path: '/api/analytics/team-summary', expectStatus: [200, 404], desc: 'Team analytics summary', auth: true },
  { method: 'GET', path: '/api/organizations', expectStatus: [200, 403], desc: 'Organizations list', auth: true },
  { method: 'GET', path: '/api/calibration/status', expectStatus: [200, 404], desc: 'Calibration status', auth: true },
  { method: 'GET', path: '/api/first-signal', expectStatus: [200, 404], desc: 'First signal', auth: true },
  { method: 'GET', path: '/api/playbook', expectStatus: [200, 404], desc: 'Playbooks', auth: true },
  { method: 'GET', path: '/api/reports', expectStatus: [200, 404], desc: 'Reports', auth: true },
  { method: 'GET', path: '/api/subscriptions/status', expectStatus: [200, 404], desc: 'Subscription status', auth: true },
  
  // Public endpoints that don't need auth
  { method: 'GET', path: '/api/fit-questionnaire/questions', expectStatus: [200, 404], desc: 'Fit questionnaire questions' },
];

let token = null;
let passed = 0;
let failed = 0;
const failures = [];

async function runTest(endpoint) {
  const { method, path, body, expectStatus, desc, auth, saveToken } = endpoint;
  
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const expectedStatuses = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
    
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    if (saveToken && responseData.token) {
      token = responseData.token;
    }
    
    if (expectedStatuses.includes(response.status)) {
      console.log(`✅ ${desc} (${method} ${path}) - ${response.status}`);
      passed++;
      return true;
    } else {
      console.log(`❌ ${desc} (${method} ${path}) - Expected ${expectedStatuses.join('|')}, got ${response.status}`);
      failures.push({ desc, path, expected: expectedStatuses, got: response.status, response: typeof responseData === 'string' ? responseData.slice(0, 200) : JSON.stringify(responseData).slice(0, 200) });
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`❌ ${desc} (${method} ${path}) - Error: ${error.message}`);
    failures.push({ desc, path, error: error.message });
    failed++;
    return false;
  }
}

async function main() {
  console.log('\n🧪 SignalTrue Backend Smoke Test\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('─'.repeat(60) + '\n');
  
  for (const endpoint of ENDPOINTS) {
    await runTest(endpoint);
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failures.length > 0) {
    console.log('❌ Failures:\n');
    for (const f of failures) {
      console.log(`  - ${f.desc}: ${f.path}`);
      if (f.error) console.log(`    Error: ${f.error}`);
      if (f.response) console.log(`    Response: ${f.response}`);
    }
    console.log('');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main();
