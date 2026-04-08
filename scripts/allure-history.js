const fs = require('fs');
const path = require('path');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  if (!exists(src)) return 0;
  ensureDir(dest);

  let copied = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copied += copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      copied += 1;
    }
  }
  return copied;
}

function rimraf(p) {
  if (!exists(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function restore() {
  const repoRoot = process.cwd();
  const historySrc = path.join(repoRoot, 'allure-history');
  const historyDest = path.join(repoRoot, 'allure-results', 'history');

  if (!exists(historySrc)) {
    console.log('[allure-history] No allure-history to restore (first run).');
    return;
  }

  rimraf(historyDest);
  const copied = copyDir(historySrc, historyDest);
  console.log(`[allure-history] Restored history files: ${copied}`);
}

function save() {
  const repoRoot = process.cwd();
  const historySrc = path.join(repoRoot, 'allure-report', 'history');
  const historyDest = path.join(repoRoot, 'allure-history');

  if (!exists(historySrc)) {
    console.log('[allure-history] No allure-report/history found to save (did you run allure generate?).');
    return;
  }

  rimraf(historyDest);
  const copied = copyDir(historySrc, historyDest);
  console.log(`[allure-history] Saved history files: ${copied}`);
}

function usage() {
  console.log('Usage: node scripts/allure-history.js <restore|save>');
  process.exit(2);
}

const cmd = process.argv[2];
if (!cmd) usage();

if (cmd === 'restore') restore();
else if (cmd === 'save') save();
else usage();
