/**
 * Comparison evidence for checking steps.
 *
 * A checking step builds a list of checks (what was compared, where the actual value came from,
 * what was expected and what was found), attaches that list to the step in the report and then
 * asserts from the same list. The report therefore shows what a step compared on passing runs
 * too, and a failure names every value that did not match.
 */

import { isDeepStrictEqual } from 'util';
import type { World } from '@cucumber/cucumber';

export interface Check {
  /** What is being compared, in the scenario's terms. */
  what: string;
  /** Where the actual value was read from (Odoo JSON-RPC, the page, PostgreSQL, the server log). */
  source: string;
  expected: unknown;
  actual: unknown;
  /** Explicit verdict for checks that are not plain equality (e.g. "at least one"). */
  pass?: boolean;
}

interface RecordedCheck extends Check {
  result: 'pass' | 'fail';
}

function describe(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'nothing';
  return JSON.stringify(value);
}

/**
 * Attach the comparison record for `rule` and fail the step if any check did not pass.
 */
export function verify(world: World, rule: string, checks: Check[]): void {
  if (checks.length === 0) {
    throw new Error(`${rule}: no values were compared`);
  }

  const recorded: RecordedCheck[] = checks.map((check) => ({
    ...check,
    result: (check.pass ?? isDeepStrictEqual(check.expected, check.actual)) ? 'pass' : 'fail',
  }));

  world.attach(JSON.stringify({ rule, checks: recorded }, null, 2), {
    mediaType: 'application/json',
    fileName: `${rule}.json`,
  });

  const failed = recorded.filter((check) => check.result === 'fail');
  if (failed.length > 0) {
    const lines = failed.map(
      (check) =>
        `  - ${check.what} (${check.source}): expected ${describe(check.expected)}, got ${describe(check.actual)}`
    );
    throw new Error(`${rule}\n${lines.join('\n')}`);
  }
}

/**
 * Poll `read` until `isReady` accepts its value or the timeout passes; return the last value read.
 * Used where Odoo saves asynchronously after a UI action and the check must not race the save.
 */
export async function pollUntil<T>(
  read: () => Promise<T>,
  isReady: (value: T) => boolean,
  timeoutMs = 10000,
  intervalMs = 500
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!isReady(value) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await read();
  }
  return value;
}
