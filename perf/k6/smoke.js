import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:8069').replace(/\/+$/, '');

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${baseUrl}/web/health`, {
    redirects: 0,
    tags: { name: 'public_health' },
  });
  check(health, {
    'public health endpoint reports pass': (response) =>
      response.status === 200 && /"status"\s*:\s*"pass"/.test(response.body ?? ''),
  });

  const login = http.get(`${baseUrl}/web/login`, {
    redirects: 0,
    tags: { name: 'public_login_page' },
  });
  check(login, {
    'public login page serves the username and password fields': (response) =>
      response.status === 200 &&
      /<input\b[^>]*\bname="login"/.test(response.body ?? '') &&
      /<input\b[^>]*\bname="password"/.test(response.body ?? ''),
  });
  sleep(1);
}
