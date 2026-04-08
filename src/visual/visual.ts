import * as fs from 'fs';
import * as path from 'path';

import type { Page } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

type VisualAssertOptions = {
  fullPage?: boolean;
  threshold?: number;
};

function isUpdateBaselineMode(): boolean {
  const v = process.env.UPDATE_BASELINE;
  return v === '1' || v?.toLowerCase() === 'true';
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
}

function readPng(filePath: string): PNG {
  const buf = fs.readFileSync(filePath);
  return PNG.sync.read(buf);
}

function writePng(filePath: string, png: PNG): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

export async function assertPageMatchesBaseline(
  page: Page,
  snapshotName: string,
  options: VisualAssertOptions = {}
): Promise<void> {
  const cleanedName = safeName(snapshotName);
  if (!cleanedName) {
    throw new Error('Visual snapshot name is empty/invalid.');
  }

  // Reduce flakiness: wait for the page to settle a bit.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);

  const baselineDir = path.resolve(process.cwd(), 'visual', 'baseline');
  const baselinePath = path.join(baselineDir, `${cleanedName}.png`);

  const actualBytes = await page.screenshot({
    fullPage: options.fullPage ?? true,
  });

  if (isUpdateBaselineMode()) {
    ensureDir(baselineDir);
    fs.writeFileSync(baselinePath, actualBytes);
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Missing visual baseline: ${baselinePath}. ` +
        `Run with UPDATE_BASELINE=1 to create it, then commit the baseline if desired.`
    );
  }

  const baseline = readPng(baselinePath);
  const actual = PNG.sync.read(actualBytes);

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    const outDir = path.resolve(process.cwd(), 'reports', 'visual');
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, `${cleanedName}.actual.png`), actualBytes);

    throw new Error(
      `Visual snapshot size mismatch for "${cleanedName}". ` +
        `Baseline is ${baseline.width}x${baseline.height}, actual is ${actual.width}x${actual.height}. ` +
        `If this is expected, re-run with UPDATE_BASELINE=1.`
    );
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const threshold = options.threshold ?? 0.1;

  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold }
  );

  if (diffPixels > 0) {
    const outDir = path.resolve(process.cwd(), 'reports', 'visual');
    const actualPath = path.join(outDir, `${cleanedName}.actual.png`);
    const diffPath = path.join(outDir, `${cleanedName}.diff.png`);

    ensureDir(outDir);
    fs.writeFileSync(actualPath, actualBytes);
    writePng(diffPath, diff);

    throw new Error(
      `Visual regression detected for "${cleanedName}" (diff pixels: ${diffPixels}). ` +
        `See ${actualPath} and ${diffPath}. To update, run with UPDATE_BASELINE=1.`
    );
  }
}
