/**
 * k6 Performance Smoke Test
 * 
 * Purpose: Lightweight test to validate basic Odoo endpoints are responding
 * Duration: 1 minute with 10 virtual users
 * Use Case: Quick validation before deployments, CI/CD health checks
 * 
 * Run: k6 run perf/k6/smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  // Load profile: 10 concurrent users for 1 minute
  vus: 10,
  duration: '1m',
  
  // Performance thresholds
  thresholds: {
    // 95% of requests must complete within 200ms
    http_req_duration: ['p(95)<200'],
    
    // Error rate must be below 1%
    errors: ['rate<0.01'],
    
    // 95% of requests should succeed
    http_req_failed: ['rate<0.01'],
  },
};

// Base URL for Odoo instance
const BASE_URL = 'http://localhost:8069';

/**
 * Main test scenario
 * Executes once per iteration for each VU
 */
export default function () {
  // Test 1: Login page availability
  const loginResponse = http.get(`${BASE_URL}/web/login`);
  
  const loginCheck = check(loginResponse, {
    'login page status is 200': (r) => r.status === 200,
    'login page loads in < 200ms': (r) => r.timings.duration < 200,
    'login page contains login form': (r) => r.body.includes('password') || r.body.includes('login'),
  });
  
  errorRate.add(!loginCheck);
  
  // Simulate user reading time
  sleep(1);
  
  // Test 2: Database selector (initial Odoo page)
  const dbSelectorResponse = http.get(`${BASE_URL}/web/database/selector`);
  
  const dbSelectorCheck = check(dbSelectorResponse, {
    'database selector responds': (r) => r.status === 200 || r.status === 303,
    'response time acceptable': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!dbSelectorCheck);
  
  // Simulate user think time
  sleep(1);
  
  // Test 3: Main web application (may redirect to login)
  const webResponse = http.get(`${BASE_URL}/web`, {
    redirects: 5, // Follow up to 5 redirects
  });
  
  const webCheck = check(webResponse, {
    'web app responds': (r) => r.status === 200 || r.status === 303,
    'web app loads quickly': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!webCheck);
  
  // Pause before next iteration
  sleep(1);
}

/**
 * Setup function - runs once before test starts
 */
export function setup() {
  console.log('🚀 Starting k6 smoke test...');
  console.log(`Target: ${BASE_URL}`);
  console.log('VUs: 10, Duration: 1 minute');
}

/**
 * Teardown function - runs once after test completes
 */
export function teardown(data) {
  console.log('✅ Smoke test completed');
}
