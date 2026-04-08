/**
 * Fleet domain types
 *
 * These types model an Odoo Community + OCA-ready fleet (trucking) domain.
 * They are intentionally independent of raw Odoo JSON-RPC shapes.
 */

/** ISO date in `YYYY-MM-DD` format as typically used by Odoo date fields. */
export type IsoDateString = `${number}-${number}-${number}`;

export type InspectionResult = 'pass' | 'fail';

/**
 * Core fleet vehicle representation used by domain steps.
 */
export interface FleetVehicle {
  id: number;
  name: string;
  licensePlate: string;
  odometer: number;
  odometerUnit?: 'miles' | 'kilometers';
  active?: boolean;
}

/**
 * Input used to ensure a vehicle exists for a test.
 */
export interface EnsureFleetVehicleInput {
  name: string;
  licensePlate?: string;
  odometer?: number;
  odometerUnit?: FleetVehicle['odometerUnit'];
  active?: boolean;
}

/**
 * Fuel log entry (normalized to gallons & price-per-gallon for trucking domain).
 */
export interface FuelLog {
  id: number;
  vehicleId: number;
  date: IsoDateString;
  gallons: number;
  pricePerGallonCents: number;
  totalCostCents: number;
  odometer?: number;
}

/**
 * Input for creating a fuel log.
 */
export interface CreateFuelLogInput {
  vehicleId: number;
  gallons: number;
  pricePerGallonCents: number;
  date?: IsoDateString;
  odometer?: number;
}

/**
 * Vehicle inspection log entry.
 *
 * Note: base Odoo Fleet may not include inspections; this is designed to map
 * cleanly to common OCA inspection modules.
 */
export interface InspectionLog {
  id: number;
  vehicleId: number;
  date: IsoDateString;
  inspectionResult: InspectionResult;
  notes?: string;
}

/**
 * Service activity (maintenance) scheduled/performed for a vehicle.
 */
export interface ServiceActivity {
  id: number;
  vehicleId: number;
  scheduledDate: IsoDateString;
  serviceType: string;
  cost: number;
  notes?: string;
}

import type { FleetVehicleModel } from '../api/models/fleet/FleetVehicleModel';
import type { FleetFuelLogModel } from '../api/models/fleet/FleetFuelLogModel';
import type { FleetInspectionModel } from '../api/models/fleet/FleetInspectionModel';
import type { FleetServiceModel } from '../api/models/fleet/FleetServiceModel';

/** Lazy-initialized Fleet model bundle exposed on CustomWorld. */
export interface FleetModels {
  vehicle: FleetVehicleModel;
  fuel: FleetFuelLogModel;
  inspection: FleetInspectionModel;
  service: FleetServiceModel;
}
