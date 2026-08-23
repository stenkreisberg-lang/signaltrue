#!/usr/bin/env node
/**
 * Smoke Test Script for SignalTrue Backend
 * Tests all core API endpoints with seeded admin credentials
 */

const BASE_URL = process.env.API_URL || 'http://localhost:8081';

const context = {
  orgId: null,
};

const ENDPOINTS = [
  // Public endpoints
  { method: 'GET', path: '/', expectStatus: 200, desc: 'Root health check' },
  { method: 'GET', path: '/api/health', expectStatus: 200, desc: 'API health check' },

  // Auth
  {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'test-user@example.com', password: 'password123' },
    expectStatus: 200,
    desc: 'Login',
    saveToken: true,
  },

  // Protected endpoints (will use saved token)
  { method: 'GET', path: '/api/auth/me', expectStatus: 200, desc: 'Get current user', auth: true },
  {
    method: 'GET',
    path: '/api/onboarding/status',
    expectStatus: 200,
    desc: 'Resolve organization context',
    auth: true,
    saveContext: true,
  },
  { method: 'GET', path: '/api/teams', expectStatus: 200, desc: 'List teams', auth: true },
  {
    method: 'GET',
    path: () => `/api/signals/org/${context.orgId}`,
    expectStatus: [200, 404],
    desc: 'List organization signals',
    auth: true,
  },
  {
    method: 'GET',
    path: () => `/api/actions/org/${context.orgId}`,
    expectStatus: 200,
    desc: 'List organization actions',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/control-review/meta',
    expectStatus: 200,
    desc: 'Load control-review metadata',
    auth: true,
  },
  {
    method: 'GET',
    path: () => `/api/calibration/status/${context.orgId}`,
    expectStatus: 200,
    desc: 'Calibration status',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/weekly-brief/latest',
    expectStatus: [200, 404],
    desc: 'Latest weekly brief',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/work-network',
    expectStatus: 200,
    desc: 'Work Network',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/subscriptions/current',
    expectStatus: 200,
    desc: 'Subscription status',
    auth: true,
  },
  { method: 'GET', path: '/api/blog?limit=1', expectStatus: 200, desc: 'Public blog feed' },
];

let token = null;
let passed = 0;
let failed = 0;
const failures = [];

async function runTest(endpoint) {
  const { method, body, expectStatus, desc, auth, saveToken, saveContext } = endpoint;
  const path = typeof endpoint.path === 'function' ? endpoint.path() : endpoint.path;

  if (path.includes('/null') || path.includes('/undefined')) {
    console.log(`❌ ${desc} (${method} ${path}) - Missing organization context`);
    failures.push({ desc, path, error: 'Missing organization context' });
    failed++;
    return false;
  }

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

    if (saveContext && responseData.orgId) {
      context.orgId = String(responseData.orgId);
    }

    const routeMissing =
      response.status === 404 &&
      typeof responseData === 'object' &&
      String(responseData?.message || '').startsWith('Route not found:');

    if (expectedStatuses.includes(response.status) && !routeMissing) {
      console.log(`✅ ${desc} (${method} ${path}) - ${response.status}`);
      passed++;
      return true;
    } else {
      console.log(
        `❌ ${desc} (${method} ${path}) - Expected ${expectedStatuses.join('|')}, got ${response.status}`
      );
      failures.push({
        desc,
        path,
        expected: expectedStatuses,
        got: response.status,
        response:
          typeof responseData === 'string'
            ? responseData.slice(0, 200)
            : JSON.stringify(responseData).slice(0, 200),
      });
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
