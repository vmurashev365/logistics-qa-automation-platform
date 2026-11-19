/**
 * Cucumber Hooks
 * Lifecycle hooks for browser management and test setup/teardown
 */

import { Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep, Status } from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser } from 'playwright';
import { CustomWorld } from './custom-world';
import { getEnvConfig, envBoolean, envInteger } from './env';
import { OdooJsonRpcClient } from '../api/clients/OdooJsonRpcClient';
import { RestApiClient } from '../api/clients/RestApiClient';
import { FleetEndpoints } from '../api/endpoints/FleetEndpoints';
import { PgClient } from '../db/PgClient';
import { AsteriskMockClient } from '../api/clients/AsteriskMockClient';
import { CouchClient } from '../db/CouchClient';
import * as fs from 'fs';
import * as path from 'path';

// Shared browser instance across all scenarios
let browser: Browser;

// Step timing diagnostics
let stepStartTime: number;
let currentStepText = '';
let currentStepIndex = 0;
let scenarioStartTime = 0;
const DEBUG_TIMING = envBoolean('DEBUG_TIMING', true);
const SLOW_STEP_THRESHOLD_MS = envInteger('SLOW_STEP_THRESHOLD_MS', 1500);

/** The test vehicle plate convention: every plate a scenario creates starts with "MD-". */
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

/**
 * BeforeAll Hook
 * Launches browser once before all scenarios
 */
BeforeAll(async function () {
  const config = getEnvConfig();
  
  console.log('\n🚀 Launching browser...');
  console.log(`   Browser: ${config.browser}`);
  console.log(`   Headless: ${config.headless}`);
  console.log(`   Base URL: ${config.baseUrl}`);
  
  browser = await { chromium, firefox, webkit }[config.browser].launch({
    headless: config.headless,
    slowMo: config.slowMo,
  });

  // Ensure reports directory exists
  const reportsDir = path.resolve(process.cwd(), 'reports/cucumber');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Ensure screenshots directory exists
  const screenshotsDir = path.resolve(process.cwd(), 'reports/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('✅ Browser launched successfully\n');
});

/**
 * Before Hook
 * Creates new context and page for each scenario
 */
Before({ timeout: 60000 }, async function (this: CustomWorld, scenario) {
  const config = getEnvConfig();
  
  // Store scenario metadata
  this.scenarioName = scenario.pickle.name;
  this.featureName = scenario.gherkinDocument?.feature?.name || 'Unknown Feature';
  
  // Assign shared browser to world
  this.browser = browser;

  // Create new context for isolation
  this.context = await browser.newContext({
    viewport: {
      width: config.viewportWidth,
      height: config.viewportHeight,
    },
    ignoreHTTPSErrors: true,
    // Record video if enabled
    ...(config.videoRecording && {
      recordVideo: {
        dir: 'reports/videos',
        size: { width: 1280, height: 720 },
      },
    }),
  });

  // Set default timeout
  this.context.setDefaultTimeout(config.timeout);

  // Create new page
  this.page = await this.context.newPage();

  // Initialize page objects
  this.initializePageObjects();

  // Initialize API Clients
  this.odooApi = new OdooJsonRpcClient(config.baseUrl);
  this.restApi = new RestApiClient(config.apiBaseUrl);
  
  this.fleetEndpoints = new FleetEndpoints(this.odooApi);

  // Vehicles this scenario names by plate. Leftovers with these exact plates (from an earlier run
  // that was interrupted before its After hook) are removed, so the scenario starts from "this
  // vehicle does not exist". Nothing else is touched: seeded data and the vehicles of scenarios
  // running in parallel (which name other plates) are left alone.
  const plates = platesNamedIn(scenario.pickle);

  try {
    await this.odooApi.authenticate(config.odooDatabase, config.odooUsername, config.odooPassword);
    console.log('✅ API clients initialized');
  } catch (error) {
    const reason = error instanceof Error ? error : new Error(String(error));
    // Scenarios that never call Odoo (e.g. the HOS calculator) still run; every Odoo call of
    // this scenario fails with this reason instead of "not authenticated".
    this.odooApi.rememberAuthenticationFailure(reason);
    if (plates.length > 0) {
      throw new Error(`Cannot remove leftover test vehicles: Odoo login failed: ${reason.message}`);
    }
    console.log(`⚠️ Odoo login failed, Odoo steps of this scenario will fail: ${reason.message}`);
  }

  for (const plate of plates) {
    const leftovers = await this.fleetEndpoints.findVehiclesByPlateIncludingArchived(plate);
    for (const vehicle of leftovers) {
      if (vehicle.id !== undefined) {
        await this.fleetEndpoints.deleteVehicleAndHistory(vehicle.id);
      }
    }
    if (leftovers.length > 0) {
      console.log(`🧹 Removed ${leftovers.length} leftover vehicle(s) with plate ${plate}`);
    }
  }

  // Initialize Database Client (if enabled)
  if (config.dbEnabled) {
    try {
      this.dbClient = PgClient.getInstance({
        host: config.postgresHost,
        port: config.postgresPort,
        user: config.postgresUser,
        password: config.postgresPassword,
        database: config.postgresDatabase,
      });
      console.log('✅ Database client initialized');
    } catch (error) {
      console.log(`⚠️ Database client initialization failed: ${error}`);
    }
  }

  // Initialize CTI Mock Client (if enabled)
  if (config.ctiMode === 'mock') {
    try {
      this.ctiClient = new AsteriskMockClient();
      await this.ctiClient.connect();
      console.log('✅ CTI mock client initialized');
    } catch (error) {
      console.log(`⚠️ CTI client initialization failed: ${error}`);
    }
  }

  // Initialize Offline Sync Mock Client (if enabled)
  if (config.offlineMode === 'mock') {
    try {
      const dbName = `test-offline-${Date.now()}`;
      this.offlineClient = new CouchClient(dbName);
      console.log('✅ Offline sync client initialized');
    } catch (error) {
      console.log(`⚠️ Offline client initialization failed: ${error}`);
    }
  }

  // Clear test data from previous scenario
  this.clearTestData();
  scenarioStartTime = Date.now();
  this.setTestData('scenarioStartedAt', scenarioStartTime);
  currentStepIndex = 0;
  currentStepText = '';

  console.log(`\n📋 Starting: ${this.scenarioName}`);
});

/**
 * After Hook
 * Handles cleanup, screenshots on failure, and resource disposal
 */
After({ timeout: 60000 }, async function (this: CustomWorld, scenario) {
  const config = getEnvConfig();

  // Take screenshot on failure
  if (scenario.result?.status === Status.FAILED && config.screenshotOnFailure) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = this.scenarioName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const screenshotPath = path.resolve(
        process.cwd(),
        `reports/screenshots/${safeName}_${timestamp}.png`
      );

      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Attach screenshot to report (base64)
      const screenshot = await this.page.screenshot({ type: 'png' });
      this.attach(screenshot, 'image/png');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }

  // Log scenario result
  const status = scenario.result?.status;
  const statusEmoji = status === Status.PASSED ? '✅' : status === Status.FAILED ? '❌' : '⚠️';
  const scenarioDuration = Date.now() - scenarioStartTime;
  console.log(`${statusEmoji} Finished: ${this.scenarioName} - ${status} (${formatDuration(scenarioDuration)})`);

  // Close page and context
  if (this.page) {
    await this.page.close().catch(() => {});
  }
  if (this.context) {
    await this.context.close().catch(() => {});
  }

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
  if (testVehicles.length > 0 && this.fleetEndpoints && this.odooApi) {
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
  console.log('\n🔒 Closing browser...');
  
  if (browser) {
    await browser.close();
  }

  // Close database pool
  try {
    await PgClient.closePool();
  } catch {
    // Pool may not have been initialized
  }

  console.log('✅ Browser closed successfully');
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
