/**
 * Custom World for Cucumber
 * Extends the default World with Playwright browser, context, page, and page objects
 */

import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from 'playwright';
import { VehiclesListPage } from '../pages/web/fleet/VehiclesListPage';
import { VehicleFormPage } from '../pages/web/fleet/VehicleFormPage';
import { LoginPage } from '../pages/web/LoginPage';
import { OdooJsonRpcClient } from '../api/clients/OdooJsonRpcClient';
import { RestApiClient } from '../api/clients/RestApiClient';
import { FleetEndpoints } from '../api/endpoints/FleetEndpoints';
import { ApiResult } from '../types/api';
import { PgClient } from '../db/PgClient';
import { AsteriskMockClient } from '../api/clients/AsteriskMockClient';
import { CouchClient } from '../db/CouchClient';
import type { FleetModels } from '../types/fleet';
import { FleetVehicleModel } from '../api/models/fleet/FleetVehicleModel';
import { FleetFuelLogModel } from '../api/models/fleet/FleetFuelLogModel';
import { FleetInspectionModel } from '../api/models/fleet/FleetInspectionModel';
import { FleetServiceModel } from '../api/models/fleet/FleetServiceModel';
import { getEnvConfig } from './env';

/**
 * Custom World class extending Cucumber's World
 * Contains browser instances, page objects, and test data storage
 *
 * Configuration comes from support/env.ts only (no Cucumber world parameters): cucumber.js is
 * evaluated before .env is loaded, so values it computed could disagree with the rest.
 */
export class CustomWorld extends World {
  // Playwright instances
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  // Page Objects - Fleet Module
  vehiclesListPage!: VehiclesListPage;
  vehicleFormPage!: VehicleFormPage;
  
  // Page Objects - Authentication
  loginPage!: LoginPage;

  // API Clients
  odooApi!: OdooJsonRpcClient;
  restApi!: RestApiClient;
  fleetEndpoints!: FleetEndpoints;

  // What the last API step received: a real HTTP response or an Odoo JSON-RPC result
  lastApiResponse?: ApiResult;

  // Database Client (PostgreSQL)
  dbClient?: PgClient;

  // Mock Services
  ctiClient?: AsteriskMockClient;
  offlineClient?: CouchClient;

  // Test data storage - use Map for type-safe key-value storage
  testData: Map<string, unknown> = new Map();

  private _fleetModels?: FleetModels;

  // Scenario metadata
  scenarioName: string = '';
  featureName: string = '';

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Lazy-initialized Fleet model adapters.
   *
   * Steps should prefer this getter over instantiating models directly.
   */
  get fleet(): FleetModels {
    if (!this._fleetModels) {
      if (!this.odooApi) {
        throw new Error('CustomWorld.fleet: odooApi is not initialized');
      }

      this._fleetModels = {
        vehicle: new FleetVehicleModel(this.odooApi),
        fuel: new FleetFuelLogModel(this.odooApi),
        inspection: new FleetInspectionModel(this.odooApi),
        service: new FleetServiceModel(this.odooApi),
      };
    }

    return this._fleetModels;
  }

  /**
   * Odoo's base URL (BASE_URL), the same value the API clients use.
   */
  getBaseUrl(): string {
    return getEnvConfig().baseUrl;
  }

  /**
   * Store test data with a key
   */
  setTestData<T>(key: string, value: T): void {
    this.testData.set(key, value);
  }

  /**
   * Retrieve test data by key
   */
  getTestData<T>(key: string): T | undefined {
    return this.testData.get(key) as T | undefined;
  }

  /**
   * Check if test data exists
   */
  hasTestData(key: string): boolean {
    return this.testData.has(key);
  }

  // Work a scenario must undo whatever its outcome (e.g. restore an Odoo setting it changed)
  private cleanups: Array<{ label: string; run: () => Promise<void> }> = [];

  /**
   * Register work the After hook must do for this scenario, pass or fail.
   * Cleanups run in reverse order of registration.
   */
  addCleanup(label: string, run: () => Promise<void>): void {
    this.cleanups.push({ label, run });
  }

  /**
   * Run and forget the registered cleanups. A cleanup that fails is reported and does not
   * stop the others.
   */
  async runCleanups(): Promise<void> {
    const pending = this.cleanups.reverse();
    this.cleanups = [];
    for (const cleanup of pending) {
      try {
        await cleanup.run();
      } catch (error) {
        console.log(`⚠️ Cleanup failed (${cleanup.label}): ${error}`);
      }
    }
  }

  /**
   * Partner ids named `name`, to pass to trackNewPartners before a step that may create one.
   */
  async partnerIdsNamed(name: string): Promise<number[]> {
    return this.odooApi.search('res.partner', [['name', '=', name]]);
  }

  /**
   * Delete, after the scenario, the partners named `name` that did not exist before it
   * (`existingIds`). Runs after the scenario's vehicles are deleted, whose driver history
   * references these partners.
   */
  trackNewPartners(name: string, existingIds: number[]): void {
    this.addCleanup(`delete partner "${name}"`, async () => {
      const ids = await this.odooApi.search('res.partner', [['name', '=', name]]);
      const created = ids.filter((id) => !existingIds.includes(id));
      if (created.length > 0) {
        await this.odooApi.unlink('res.partner', created);
        console.log(`🗑️ Cleanup: deleted partner "${name}"`);
      }
    });
  }

  /**
   * Register a vehicle plate for deletion by the After hook.
   */
  trackVehicle(plate: string): void {
    const plates = this.getTestData<string[]>('testVehicles') || [];
    if (!plates.includes(plate)) {
      plates.push(plate);
    }
    this.setTestData('testVehicles', plates);
  }

  /**
   * Clear all test data
   */
  clearTestData(): void {
    this.testData.clear();
  }

  /**
   * Initialize page objects after page is created
   */
  initializePageObjects(): void {
    this.vehiclesListPage = new VehiclesListPage(this.page);
    this.vehicleFormPage = new VehicleFormPage(this.page);
    this.loginPage = new LoginPage(this.page);
  }
}

// Set the world constructor for Cucumber
setWorldConstructor(CustomWorld);

export default CustomWorld;
