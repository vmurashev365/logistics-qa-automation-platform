/**
 * Read the Odoo server log of the local Docker stack.
 *
 * Odoo writes some security events (for example failed logins with the source IP) only to its
 * server log. Where that log goes depends on the stack:
 * - docker-compose.yml mounts odoo.conf, whose `logfile` sends the log to /var/log/odoo/odoo.log
 *   inside the container (default here);
 * - without a logfile (e.g. the CI `docker run`), Odoo logs to the container output: set
 *   ODOO_LOG_FILE to an empty value to read `docker logs` instead.
 *
 * ODOO_CONTAINER names the container (default: logistics-qa-odoo, as in docker-compose.yml).
 */

import { execFile } from 'child_process';

const DOCKER_TIMEOUT_MS = 20000;

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      args,
      { timeout: DOCKER_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const reason = error.killed ? `timed out after ${DOCKER_TIMEOUT_MS} ms` : error.message.split('\n')[0];
          reject(new Error(`docker ${args[0]} failed: ${reason}`));
          return;
        }
        // Odoo writes its log to stderr when it logs to the container output.
        resolve(`${stdout}${stderr}`);
      }
    );
  });
}

/**
 * The last `tailLines` lines of the Odoo server log.
 */
export async function readOdooServerLog(tailLines = 5000): Promise<string> {
  const container = process.env.ODOO_CONTAINER?.trim() || 'logistics-qa-odoo';
  const logFile = process.env.ODOO_LOG_FILE === undefined ? '/var/log/odoo/odoo.log' : process.env.ODOO_LOG_FILE.trim();

  if (logFile) {
    return run(['exec', container, 'tail', '-n', String(tailLines), logFile]);
  }
  return run(['logs', '--tail', String(tailLines), container]);
}

export interface FailedLoginEntry {
  /** Log timestamp as written by Odoo (UTC, "YYYY-MM-DD HH:MM:SS,mmm"). */
  timestamp: string;
  login: string;
  ip: string;
}

/**
 * Odoo's "Login failed for db:<db> login:<login> from <ip>" entries for `login`.
 */
export function findFailedLogins(log: string, login: string): FailedLoginEntry[] {
  const escaped = login.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2},\\d{3}) .*Login failed for db:\\S+ login:${escaped} from (\\S+)`,
    'gm'
  );
  const entries: FailedLoginEntry[] = [];
  for (const match of log.matchAll(pattern)) {
    entries.push({ timestamp: match[1], login, ip: match[2] });
  }
  return entries;
}

/** Parse an Odoo log timestamp (UTC) into epoch milliseconds. */
export function parseOdooLogTimestamp(timestamp: string): number {
  return Date.parse(`${timestamp.replace(' ', 'T').replace(',', '.')}Z`);
}
