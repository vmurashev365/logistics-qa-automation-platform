/**
 * Cucumber Hooks
 * Lifecycle hooks for browser management and test setup/teardown
 */

import { Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep, Status } from '@cucumber/cucumber';
import { chromium, Browser } from 'playwright';
import { CustomWorld } from './custom-world';
import { getEnvConfig } from './env';
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
const DEBUG_TIMING = process.env.DEBUG_TIMING !== 'false';
const SLOW_STEP_THRESHOLD_MS = parseInt(process.env.SLOW_STEP_THRESHOLD_MS || '1500', 10);

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
  console.log(`   Browser: chromium`);
  console.log(`   Headless: ${config.headless}`);
  console.log(`   Base URL: ${config.baseUrl}`);
  
  browser = await chromium.launch({
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
  this.restApi = new RestApiClient(process.env.REST_BASE_URL || config.baseUrl);
  
  // Authenticate Odoo API client
  try {
    await this.odooApi.authenticate(config.odooDatabase, config.odooUsername, config.odooPassword);
    this.fleetEndpoints = new FleetEndpoints(this.odooApi);
    console.log('✅ API clients initialized');
    
    // Cleanup test vehicles BEFORE scenario (ensure clean state)
    try {
      const testPatterns = ['MD-INT-TEST-%', 'MD-E2E-%', 'MD-AUDIT-%', 'MD-TEST-%', 'MD-DRV-%', 'MD-CTI-%', 'MD-OFF-%', 'MD-API-%', 'MD-BATCH-%', 'MD-CONFLICT-%'];
      let totalDeleted = 0;
      
      for (const pattern of testPatterns) {
        const vehicles = await this.fleetEndpoints.searchVehiclesByPlate(pattern.replace('%', ''));
        for (const vehicle of vehicles) {
          try {
            const vehicleId = vehicle.id;
            if (!vehicleId) {
              continue;
            }

            // First, delete driver assignment logs to avoid FK constraint
            const assignmentLogs = await this.odooApi.search('fleet.vehicle.assignation.log', [['vehicle_id', '=', vehicleId]]);
            if (assignmentLogs.length > 0) {
              await this.odooApi.unlink('fleet.vehicle.assignation.log', assignmentLogs);
            }
            
            // Delete odometer records
            const odometerRecords = await this.odooApi.search('fleet.vehicle.odometer', [['vehicle_id', '=', vehicleId]]);
            if (odometerRecords.length > 0) {
              await this.odooApi.unlink('fleet.vehicle.odometer', odometerRecords);
            }
            
            // Now delete the vehicle
            await this.odooApi.unlink('fleet.vehicle', [vehicleId]);
            totalDeleted++;
          } catch {
            // Try archiving if delete fails
            try {
              const vehicleId = vehicle.id;
              if (vehicleId) {
                await this.odooApi.write('fleet.vehicle', [vehicleId], { active: false });
              }
            } catch {
              // Ignore
            }
          }
        }
      }
      
      if (totalDeleted > 0) {
        console.log(`🧹 Pre-test cleanup: removed ${totalDeleted} test vehicles`);
      }
    } catch (error) {
      console.log(`⚠️ Pre-test cleanup failed: ${error}`);
    }
  } catch {
    console.log(`⚠️ API authentication deferred (will authenticate on first API step)`);
    this.fleetEndpoints = new FleetEndpoints(this.odooApi);
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
  currentStepIndex = 0;
  currentStepText = '';

  console.log(`\n📋 Starting: ${this.scenarioName}`);
});

/**
 * After Hook
 * Handles cleanup, screenshots on failure, and resource disposal
 */
After(async function (this: CustomWorld, scenario) {
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

  // Cleanup test vehicles created during this scenario
  const testVehicles = this.getTestData<string[]>('testVehicles') || [];
  if (testVehicles.length > 0 && this.fleetEndpoints && this.odooApi) {
    try {
      for (const plate of testVehicles) {
        const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
        if (vehicle?.id) {
          // First, delete driver assignment logs to avoid FK constraint
          const assignmentLogs = await this.odooApi.search('fleet.vehicle.assignation.log', [['vehicle_id', '=', vehicle.id]]);
          if (assignmentLogs.length > 0) {
            await this.odooApi.unlink('fleet.vehicle.assignation.log', assignmentLogs);
          }
          
          // Delete odometer records
          const odometerRecords = await this.odooApi.search('fleet.vehicle.odometer', [['vehicle_id', '=', vehicle.id]]);
          if (odometerRecords.length > 0) {
            await this.odooApi.unlink('fleet.vehicle.odometer', odometerRecords);
          }
          
          // Now delete the vehicle
          await this.fleetEndpoints.deleteVehicle(vehicle.id);
          console.log(`🗑️ Cleanup: deleted test vehicle ${plate}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Test vehicle cleanup failed: ${error}`);
    }
  }
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
