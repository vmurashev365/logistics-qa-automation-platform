import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:8069').replace(/\/+$/, '');
const database = __ENV.ODOO_DATABASE || 'logistics_qa_db';
const username = __ENV.ODOO_USERNAME;
const password = __ENV.ODOO_PASSWORD;
const operation = 'fleet_vehicle_search_read';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    [`checks{name:${operation}}`]: ['rate>0.95'],
    [`http_req_failed{name:${operation}}`]: ['rate<0.05'],
    [`http_req_duration{name:${operation}}`]: ['p(95)<500', 'p(99)<1000'],
  },
};

function callOdoo(service, method, args, name) {
  return http.post(
    `${baseUrl}/jsonrpc`,
    JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: { service, method, args } }),
    { headers: { 'Content-Type': 'application/json' }, redirects: 0, tags: { name } },
  );
}

function readResult(response) {
  if (response.status !== 200) return undefined;

  try {
    const envelope = response.json();
    if (envelope?.jsonrpc === '2.0' && envelope.id === 1 && !envelope.error) {
      return envelope.result;
    }
  } catch {
    // An HTML response or malformed JSON cannot satisfy the check.
  }
  return undefined;
}

export function setup() {
  if (!username || !password) {
    throw new Error('Set ODOO_USERNAME and ODOO_PASSWORD for the Fleet demo account.');
  }
  const userId = readResult(callOdoo('common', 'authenticate', [database, username, password, {}], 'odoo_authenticate'));
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Odoo JSON-RPC authentication failed. Check the target database and demo account.');
  }
  return { userId };
}

export default function ({ userId }) {
  const response = callOdoo('object', 'execute_kw', [
    database, userId, password, 'fleet.vehicle', 'search_read', [[]],
    { fields: ['id', 'license_plate', 'driver_id'], limit: 20, order: 'id' },
  ], operation);

  const vehicles = readResult(response);
  check(response, {
    'Fleet search_read returns an array of up to 20 valid vehicle records': () =>
      Array.isArray(vehicles) &&
      vehicles.length <= 20 &&
      vehicles.every((vehicle) =>
        Number.isInteger(vehicle.id) &&
        (typeof vehicle.license_plate === 'string' || vehicle.license_plate === false) &&
        (vehicle.driver_id === false ||
          (Array.isArray(vehicle.driver_id) &&
            Number.isInteger(vehicle.driver_id[0]) &&
            typeof vehicle.driver_id[1] === 'string'))),
  }, { name: operation });
  sleep(1);
}
