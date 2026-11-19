/**
 * Cucumber Hooks
 * Scenario resources and cleanup
 */

import { Before, After, AfterAll, BeforeStep, AfterStep, Status } from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser } from 'playwright';
import { CustomWorld } from './custom-world';
import { getEnvConfig, envBoolean, envInteger } from './env';
import { PgClient } from '../db/PgClient';
import { AsteriskMockClient } from '../api/clients/AsteriskMockClient';
import { CouchClient } from '../db/CouchClient';
import { randomUUID } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';

// Each worker shares a browser only after its first browser scenario.
let browser: Browser | undefined;

// Step timing diagnostics
let stepStartTime: number;
let currentStepText = '';
let currentStepIndex = 0;
const DEBUG_TIMING = envBoolean('DEBUG_TIMING', true);
const SLOW_STEP_THRESHOLD_MS = envInteger('SLOW_STEP_THRESHOLD_MS', 1500);

/** Fixed fixture plates eligible for stale-record cleanup. */
const TEST_PLATE = /^MD-/;

interface PickleLike {
  steps: ReadonlyArray<{
    text: string;
    argument?: { dataTable?: { rows: ReadonlyArray<{ cells: ReadonlyArray<{ value: string }> }> } };
  }>;
}

/**
 * Test vehicle plates a scenario names: quoted "MD-..." values in its steps and "MD-..." cells
 * of its data tables. Prefixes used for searching (e.g. "MD-SEARCH") are names of no vehicle,
 * so they match nothing.
 */
function platesNamedIn(pickle: PickleLike): string[] {
  const plates = new Set<string>();
  for (const step of pickle.steps) {
    for (const match of step.text.matchAll(/"([^"]*)"/g)) {
      if (TEST_PLATE.test(match[1])) plates.add(match[1]);
    }
    for (const row of step.argument?.dataTable?.rows ?? []) {
      for (const cell of row.cells) {
        if (TEST_PLATE.test(cell.value.trim())) plates.add(cell.value.trim());
      }
    }
  }
  return [...plates];
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

Before(function (this: CustomWorld, scenario) {
  this.scenarioName = scenario.pickle.name;
  this.featureName = scenario.gherkinDocument?.feature?.name || 'Unknown Feature';
  this.setTestData('scenarioStartedAt', Date.now());
  currentStepIndex = 0;
  currentStepText = '';
  console.log('Starting: ' + this.scenarioName);
});

Before({ tags: '@browser', timeout: 60000 }, async function (this: CustomWorld) {
  const config = getEnvConfig();
  if (!browser?.isConnected()) {
    browser = await { chromium, firefox, webkit }[config.browser].launch({
      headless: config.headless,
      slowMo: config.slowMo,
    });
  }
  this.browserContext = await browser.newContext({
    viewport: { width: config.viewportWidth, height: config.viewportHeight },
    ignoreHTTPSErrors: true,
    ...(config.videoRecording && {
      recordVideo: { dir: 'reports/videos', size: { width: 1280, height: 720 } },
    }),
  });
  this.context.setDefaultTimeout(config.timeout);
  this.browserPage = await this.context.newPage();
  this.initializePageObjects();
});

Before({ tags: '@odoo-api', timeout: 60000 }, async function (this: CustomWorld, scenario) {
  await this.authenticateOdoo();

  // Remove leftovers for the exact plates this scenario names before creating fixtures.
  // Other invocations that use the same fixed plates must have their own database.
  for (const plate of platesNamedIn(scenario.pickle)) {
    const leftovers = await this.fleetEndpoints.findVehiclesByPlateIncludingArchived(plate);
    for (const vehicle of leftovers) {
      if (vehicle.id !== undefined) {
        await this.fleetEndpoints.deleteVehicleAndHistory(vehicle.id);
      }
    }
    if (leftovers.length > 0) {
      console.log('Removed ' + leftovers.length + ' leftover vehicle(s) with plate ' + plate);
    }
  }
});

Before({ tags: '@cti-integration' }, async function (this: CustomWorld) {
  if (getEnvConfig().ctiMode === 'mock') {
    this.ctiClient = new AsteriskMockClient();
    await this.ctiClient.connect();
  }
});

Before({ tags: '@offline-sync' }, function (this: CustomWorld) {
  if (getEnvConfig().offlineMode === 'mock') {
    this.offlineClient = new CouchClient('test-offline-' + randomUUID());
  }
});

/**
 * After Hook
 * Handles cleanup, screenshots on failure, and resource disposal
 */
After({ timeout: 60000 }, async function (this: CustomWorld, scenario) {
  const config = getEnvConfig();

  // Take screenshot on failure
  if (this.browserPage && scenario.result?.status === Status.FAILED && config.screenshotOnFailure) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = this.scenarioName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const screenshotPath = path.resolve(
        process.cwd(),
        `reports/screenshots/${safeName}_${timestamp}.png`
      );

      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      const screenshot = await this.browserPage.screenshot({ path: screenshotPath, fullPage: true });

      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Attach screenshot to report (base64)
      this.attach(screenshot, 'image/png');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }

  // Log scenario result
  const status = scenario.result?.status;
  const statusEmoji = status === Status.PASSED ? '✅' : status === Status.FAILED ? '❌' : '⚠️';
  const scenarioDuration = Date.now() - (this.getTestData<number>('scenarioStartedAt') ?? Date.now());
  console.log(`${statusEmoji} Finished: ${this.scenarioName} - ${status} (${formatDuration(scenarioDuration)})`);

  // Closing the context also closes its pages and finishes any recording.
  await this.browserContext?.close().catch(error => console.error('Browser context cleanup failed:', error));

  // Cleanup CTI mock client
  if (this.ctiClient) {
    try {
      this.ctiClient.clearLog();
      if (this.ctiClient.isClientConnected()) {
        await this.ctiClient.disconnect();
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  // Cleanup offline sync client
  if (this.offlineClient) {
    try {
      await this.offlineClient.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }

  // Cleanup test vehicles created during this scenario. First: the cleanups registered below
  // delete drivers, which the vehicles' driver history still references.
  const testVehicles = this.getTestData<string[]>('testVehicles') || [];
  if (testVehicles.length > 0) {
    for (const plate of testVehicles) {
      try {
        // Archived ones too, with the history that blocks unlink
        const vehicles = await this.fleetEndpoints.findVehiclesByPlateIncludingArchived(plate);
        for (const vehicle of vehicles) {
          if (vehicle.id !== undefined) {
            await this.fleetEndpoints.deleteVehicleAndHistory(vehicle.id);
            console.log(`🗑️ Cleanup: deleted test vehicle ${plate}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Test vehicle cleanup failed for ${plate}: ${error}`);
      }
    }
  }

  // Undo what the scenario registered (drivers it created, Odoo settings it changed)
  await this.runCleanups();
});

/**
 * AfterAll Hook
 * Closes browser after all scenarios complete
 */
AfterAll(async function () {
  try {
    await browser?.close();
  } finally {
    await PgClient.closePool();
  }
  console.log('\n📊 Test run complete. Check reports/cucumber for results.\n');
});

/**
 * BeforeStep Hook
 * Records step start time for diagnostics
 */
BeforeStep(async function (step) {
  if (DEBUG_TIMING) {
    stepStartTime = Date.now();
    currentStepIndex += 1;
    currentStepText = step.pickleStep?.text || 'Unknown step';
    console.log(`   ${currentStepIndex}. → ${currentStepText}`);
  }
});

/**
 * AfterStep Hook
 * Reports step execution time for diagnostics
 */
AfterStep(async function (step) {
  if (DEBUG_TIMING) {
    const duration = Date.now() - stepStartTime;
    const stepText = currentStepText || step.pickleStep?.text || 'Unknown step';
    const status = step.result?.status || 'UNKNOWN';
    const isSlowStep = duration >= SLOW_STEP_THRESHOLD_MS;
    const statusIcon = status === Status.PASSED
      ? '✅'
      : status === Status.FAILED
        ? '❌'
        : status === Status.SKIPPED
          ? '⏭️'
          : '⚠️';
    const slowLabel = isSlowStep ? ' SLOW' : '';
    console.log(`   ${currentStepIndex}. ${statusIcon}${slowLabel} ${formatDuration(duration)} - ${stepText}`);
  }
});
