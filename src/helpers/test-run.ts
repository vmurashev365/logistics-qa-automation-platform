/**
 * Test run helpers.
 *
 * Provides a deterministic suffix for test data identifiers to avoid
 * collisions in DEMO/CI environments.
 */

function optionalTrim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function sanitizeSuffix(value: string): string {
  // Allow alnum and dashes only.
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function shortFromTestRunId(testRunId: string): string {
  const cleaned = sanitizeSuffix(testRunId);
  if (!cleaned) return '';
  // Use the last 6 chars for locality and uniqueness.
  return cleaned.slice(Math.max(0, cleaned.length - 6));
}

export function getRunSuffix(): string {
  const runSuffix = optionalTrim(process.env.RUN_SUFFIX);
  if (runSuffix) {
    return sanitizeSuffix(runSuffix);
  }

  const testRunId = optionalTrim(process.env.TEST_RUN_ID);
  if (testRunId) {
    return shortFromTestRunId(testRunId);
  }

  return '';
}

export function withRunSuffix(base: string): string {
  const suffix = getRunSuffix();
  if (!suffix) return base;

  // Avoid double-appending.
  if (base.endsWith(`-${suffix}`)) return base;
  if (base.endsWith(suffix) && base.length > suffix.length && base[base.length - suffix.length - 1] === '-') {
    return base;
  }

  return `${base}-${suffix}`;
}
