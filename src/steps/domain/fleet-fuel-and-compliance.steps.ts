/**
 * Fleet Fuel & Compliance Domain Steps
 *
 * Thin Cucumber bindings that exercise the Odoo Fleet model adapters.
 * Business logic and Odoo mappings live in the model layer.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../../support/custom-world';
import type { FuelLog, FleetVehicle, InspectionLog, InspectionResult } from '../../types/fleet';
import { toCents } from '../../helpers/money';
import { withRunSuffix } from '../../helpers/test-run';

const TESTDATA_KEYS = {
  vehicle: 'fleet:vehicle',
  fuelLog: 'fleet:fuelLog',
  inspectionLog: 'fleet:inspectionLog',
} as const;

function parseInspectionResult(value: string): InspectionResult {
  if (value === 'pass' || value === 'fail') {
    return value;
  }
  throw new Error(`Invalid inspection result: ${value}. Expected "pass" or "fail".`);
}

Given('a fleet vehicle {string} exists', { timeout: 30000 }, async function (this: CustomWorld, name: string) {
  const resolvedName = withRunSuffix(name);

  const vehicle = await this.fleet.vehicle.ensureExists({
    name: resolvedName,
    // Provide a deterministic plate so repeated runs are stable.
    licensePlate: resolvedName.toUpperCase().replace(/\s+/g, '-'),
    odometer: 0,
    odometerUnit: 'miles',
    active: true,
  });

  this.setTestData<FleetVehicle>(TESTDATA_KEYS.vehicle, vehicle);
});

When(
  'I log fuel of {int} gallons at price {float} for truck {string}',
  { timeout: 30000 },
  async function (this: CustomWorld, gallons: number, pricePerGallon: number, vehicleName: string) {
    const resolvedVehicleName = withRunSuffix(vehicleName);

    const vehicle =
      this.getTestData<FleetVehicle>(TESTDATA_KEYS.vehicle) ??
      (await this.fleet.vehicle.getByName(resolvedVehicleName));

    const fuelLog = await this.fleet.fuel.createFuelLog({
      vehicleId: vehicle.id,
      gallons,
      pricePerGallonCents: toCents(pricePerGallon),
    });

    this.setTestData<FuelLog>(TESTDATA_KEYS.fuelLog, fuelLog);
  }
);

When(
  'I update odometer of truck {string} to {int} miles',
  { timeout: 30000 },
  async function (this: CustomWorld, vehicleName: string, miles: number) {
    const resolvedVehicleName = withRunSuffix(vehicleName);
    const vehicle =
      this.getTestData<FleetVehicle>(TESTDATA_KEYS.vehicle) ??
      (await this.fleet.vehicle.getByName(resolvedVehicleName));

    await this.fleet.vehicle.updateOdometer(vehicle.id, miles);

    // Update cached vehicle snapshot for later assertions if needed.
    this.setTestData<FleetVehicle>(TESTDATA_KEYS.vehicle, { ...vehicle, odometer: miles, odometerUnit: 'miles' });
  }
);

Then(
  'the fuel log should be stored correctly for truck {string}',
  { timeout: 30000 },
  async function (this: CustomWorld, vehicleName: string) {
    const resolvedVehicleName = withRunSuffix(vehicleName);

    const vehicle =
      this.getTestData<FleetVehicle>(TESTDATA_KEYS.vehicle) ??
      (await this.fleet.vehicle.getByName(resolvedVehicleName));
    const created = this.getTestData<FuelLog>(TESTDATA_KEYS.fuelLog);

    expect(created, 'Expected a fuel log to be created during scenario').toBeTruthy();
    if (!created) return;

    const latest = await this.fleet.fuel.getLatestForVehicle(vehicle.id);

    expect(latest.vehicleId).toBe(vehicle.id);
    expect(latest.id).toBe(created.id);

    // Values are subject to liter<->gallon conversion; assert with tolerance.
    expect(latest.gallons).toBeCloseTo(created.gallons, 3);
    expect(Math.abs(latest.pricePerGallonCents - created.pricePerGallonCents)).toBeLessThanOrEqual(1);
    expect(Math.abs(latest.totalCostCents - created.totalCostCents)).toBeLessThanOrEqual(1);
  }
);

When(
  'I record a {string} inspection for truck {string}',
  { timeout: 30000 },
  async function (this: CustomWorld, resultRaw: string, vehicleName: string) {
    const resolvedVehicleName = withRunSuffix(vehicleName);

    const vehicle =
      this.getTestData<FleetVehicle>(TESTDATA_KEYS.vehicle) ??
      (await this.fleet.vehicle.getByName(resolvedVehicleName));
    const result = parseInspectionResult(resultRaw);

    const inspection = await this.fleet.inspection.createInspection(vehicle.id, result);
    this.setTestData<InspectionLog>(TESTDATA_KEYS.inspectionLog, inspection);
  }
);

Then(
  'inspection should be visible in fleet records',
  { timeout: 30000 },
  async function (this: CustomWorld) {
    const vehicle = this.getTestData<FleetVehicle>(TESTDATA_KEYS.vehicle);
    const created = this.getTestData<InspectionLog>(TESTDATA_KEYS.inspectionLog);

    expect(vehicle, 'Expected vehicle to be present in test data').toBeTruthy();
    expect(created, 'Expected inspection to be created during scenario').toBeTruthy();

    if (!vehicle || !created) return;

    const latest = await this.fleet.inspection.getLatestForVehicle(vehicle.id);
    expect(latest.id).toBe(created.id);
    expect(latest.vehicleId).toBe(vehicle.id);
    expect(latest.inspectionResult).toBe(created.inspectionResult);
  }
);
