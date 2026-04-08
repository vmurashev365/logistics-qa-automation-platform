/**
 * k6 Load Test
 * 
 * Purpose: Simulate realistic traffic to Odoo Fleet Management system
 * Duration: 9 minutes with staged ramp-up and ramp-down
 * Use Case: Capacity planning, performance regression testing, stress testing
 * 
 * Run: k6 run perf/k6/load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const fleetLoadTime = new Trend('fleet_load_time');

// Test configuration with staged load profile
export const options = {
  // Staged load simulation
  stages: [
    // Phase 1: Ramp-up (0 → 50 VUs over 2 minutes)
    { duration: '2m', target: 50 },
    
    // Phase 2: Sustained load (50 VUs for 5 minutes)
    { duration: '5m', target: 100 },
    
    // Phase 3: Ramp-down (100 → 0 VUs over 2 minutes)
    { duration: '2m', target: 0 },
  ],
  
  // Performance thresholds
  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    
    // 99% of requests must complete within 1 second
    'http_req_duration{name:fleet_vehicles}': ['p(99)<1000'],
    
    // Error rate must be below 5%
    errors: ['rate<0.05'],
    
    // HTTP failure rate below 5%
    http_req_failed: ['rate<0.05'],
    
    // Custom metric: fleet page load time
    fleet_load_time: ['p(95)<800'],
  },
};

// Base URL for Odoo instance
const BASE_URL = 'http://localhost:8069';

// HTTP headers for API requests
const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

/**
 * Main test scenario
 * Simulates a user navigating the Fleet Management system
 */
export default function () {
  // =================================================================
  // Phase 1: User authentication check
  // =================================================================
  
  const loginResponse = http.get(`${BASE_URL}/web/login`, {
    tags: { name: 'login_page' },
  });
  
  check(loginResponse, {
    'login page available': (r) => r.status === 200,
    'login page loads fast': (r) => r.timings.duration < 300,
  });
  
  // Simulate reading login page
  sleep(randomSleep(1, 2));
  
  // =================================================================
  // Phase 2: Access Fleet module (main test target)
  // =================================================================
  
  const fleetStartTime = Date.now();
  
  const fleetResponse = http.get(
    `${BASE_URL}/web#action=fleet.fleet_vehicle_action`,
    {
      headers: headers,
      tags: { name: 'fleet_vehicles' },
    }
  );
  
  const fleetDuration = Date.now() - fleetStartTime;
  fleetLoadTime.add(fleetDuration);
  
  const fleetCheck = check(fleetResponse, {
    'fleet module loads': (r) => r.status === 200 || r.status === 303,
    'fleet response time OK': (r) => r.timings.duration < 800,
    'fleet page has content': (r) => r.body.length > 1000,
  });
  
  errorRate.add(!fleetCheck);
  
  // Simulate user viewing fleet list
  sleep(randomSleep(2, 4));
  
  // =================================================================
  // Phase 3: Load vehicle data (simulated API call)
  // =================================================================
  
  // Note: This simulates loading vehicle list view
  // In real scenario, this would be a JSON-RPC call to Odoo
  const vehicleListResponse = http.get(
    `${BASE_URL}/web#model=fleet.vehicle&view_type=list`,
    {
      headers: headers,
      tags: { name: 'vehicle_list' },
    }
  );
  
  const vehicleCheck = check(vehicleListResponse, {
    'vehicle list loads': (r) => r.status === 200 || r.status === 303,
    'vehicle list responds quickly': (r) => r.timings.duration < 600,
  });
  
  errorRate.add(!vehicleCheck);
  
  // Simulate user browsing vehicles
  sleep(randomSleep(2, 5));
  
  // =================================================================
  // Phase 4: Access driver management
  // =================================================================
  
  const driverResponse = http.get(
    `${BASE_URL}/web#model=fleet.driver&view_type=list`,
    {
      headers: headers,
      tags: { name: 'driver_list' },
    }
  );
  
  check(driverResponse, {
    'driver list accessible': (r) => r.status === 200 || r.status === 303,
    'driver list performance': (r) => r.timings.duration < 700,
  });
  
  // Simulate user reviewing drivers
  sleep(randomSleep(1, 3));
  
  // =================================================================
  // Phase 5: Dashboard access
  // =================================================================
  
  const dashboardResponse = http.get(
    `${BASE_URL}/web`,
    {
      headers: headers,
      tags: { name: 'dashboard' },
      redirects: 5,
    }
  );
  
  check(dashboardResponse, {
    'dashboard available': (r) => r.status === 200,
    'dashboard loads in time': (r) => r.timings.duration < 500,
  });
  
  // End of user session - realistic pause before next iteration
  sleep(randomSleep(2, 5));
}

/**
 * Helper function: Random sleep duration
 * Simulates realistic user behavior with variable think time
 * 
 * @param {number} min - Minimum seconds
 * @param {number} max - Maximum seconds
 * @returns {number} Random duration between min and max
 */
function randomSleep(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Setup function - runs once before test starts
 */
export function setup() {
  console.log('🚀 Starting k6 load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log('Profile: 0→50 (2m), 50→100 (5m), 100→0 (2m)');
  console.log('Total duration: 9 minutes');
  
  // Verify target is reachable
  const healthCheck = http.get(`${BASE_URL}/web/login`);
  if (healthCheck.status !== 200) {
    throw new Error(`Target unreachable: ${BASE_URL} returned ${healthCheck.status}`);
  }
  
  console.log('✅ Health check passed - starting load test');
  
  return { startTime: Date.now() };
}

/**
 * Teardown function - runs once after test completes
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('✅ Load test completed');
  console.log(`Total duration: ${duration.toFixed(2)} seconds`);
}

/**
 * Handle test summary
 * Called at the end with test results
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

/**
 * Simple text summary (built-in k6 function fallback)
 */
function textSummary(data, options) {
  const { indent = '', enableColors = false } = options || {};
  
  const metrics = data.metrics;
  let summary = '\n';
  summary += `${indent}✓ checks.........................: ${(metrics.checks.values.passes / metrics.checks.values.fails * 100).toFixed(2)}% passed\n`;
  summary += `${indent}✓ http_req_duration..............: avg=${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}✓ http_reqs......................: ${metrics.http_reqs.values.count} requests\n`;
  summary += `${indent}✓ iterations.....................: ${metrics.iterations.values.count}\n`;
  
  return summary;
}
