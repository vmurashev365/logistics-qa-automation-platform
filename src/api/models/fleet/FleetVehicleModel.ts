/**
 * FleetVehicleModel
 *
 * Typed model adapter over OdooJsonRpcClient for `fleet.vehicle`.
 * Hides JSON-RPC details and normalizes Odoo record shapes into domain types.
 */

import { OdooJsonRpcClient } from '../../clients/OdooJsonRpcClient';
import type { FleetVehicle, EnsureFleetVehicleInput, IsoDateString } from '../../../types/fleet';

interface OdooFleetVehicleRecord {
  id: number;
  name?: string;
  license_plate?: string;
  odometer?: number;
  odometer_unit?: 'kilometers' | 'miles';
  active?: boolean;
}

interface OdooFleetVehicleModelRecord {
  id: number;
  name: string;
}

/**
 * Configuration options to support OCA/community variations.
 */
export interface FleetVehicleModelOptions {
  vehicleModelName?: string;
  vehicleModelModelName?: string;
  vehicleBrandModelName?: string;
  odometerModelName?: string;
}

/**
 * Typed adapter for fleet vehicles.
 */
export class FleetVehicleModel {
  private readonly vehicleModelName: string;
  private readonly vehicleModelModelName: string;
  private readonly vehicleBrandModelName: string;
  private readonly odometerModelName: string;

  /**
   * Create a FleetVehicleModel.
   * @param client - Authenticated Odoo JSON-RPC client
   * @param options - Optional model name overrides for OCA/community differences
   */
  constructor(
    private readonly client: OdooJsonRpcClient,
    options: FleetVehicleModelOptions = {}
  ) {
    this.vehicleModelName = options.vehicleModelName ?? 'fleet.vehicle';
    this.vehicleModelModelName = options.vehicleModelModelName ?? 'fleet.vehicle.model';
    this.vehicleBrandModelName = options.vehicleBrandModelName ?? 'fleet.vehicle.model.brand';
    this.odometerModelName = options.odometerModelName ?? 'fleet.vehicle.odometer';
  }

  /**
   * Active vehicles with exactly this license plate.
   *
   * Vehicles are identified by plate, not by `name`: in Odoo `name` is computed as
   * "Brand/Model/Plate", so a test name such as "Truck-01" never equals it. Looking vehicles up
   * by name found nothing on every run and created a new vehicle each time.
   */
  async findByLicensePlate(plate: string): Promise<FleetVehicle[]> {
    const records = await this.client.searchRead<OdooFleetVehicleRecord>(
      this.vehicleModelName,
      [['license_plate', '=', plate]],
      ['id', 'name', 'license_plate', 'odometer', 'odometer_unit', 'active']
    );
    return records.map((record) => FleetVehicleModel.toDomain(record));
  }

  /**
   * The one active vehicle with this license plate. No vehicle, or several, is an error.
   */
  async getByLicensePlate(plate: string): Promise<FleetVehicle> {
    const vehicles = await this.findByLicensePlate(plate);
    if (vehicles.length !== 1) {
      throw new Error(
        `FleetVehicleModel.getByLicensePlate: expected one vehicle with plate "${plate}", found ${vehicles.length}`
      );
    }
    return vehicles[0];
  }

  /**
   * Reuse the vehicle with the plate derived from `input`, or create it.
   * `created` tells the caller whether it must delete the vehicle afterwards. Several vehicles
   * with the plate are an error: picking one would hide duplicates.
   *
   * Odoo Fleet requires `model_id`, which is auto-provisioned for test usage.
   */
  async ensureExists(input: EnsureFleetVehicleInput): Promise<{ vehicle: FleetVehicle; created: boolean }> {
    const plate = input.licensePlate ?? FleetVehicleModel.licensePlateFor(input.name);
    const existing = await this.findByLicensePlate(plate);
    if (existing.length > 1) {
      throw new Error(
        `FleetVehicleModel.ensureExists: ${existing.length} vehicles have license plate "${plate}", ` +
          'expected at most one. Remove the duplicates, e.g. with npm run db:clean.'
      );
    }
    if (existing.length === 1) {
      return { vehicle: existing[0], created: false };
    }

    const modelId = await this.getOrCreateDefaultVehicleModelId();
    const createdId = await this.client.create(this.vehicleModelName, {
      license_plate: plate,
      model_id: modelId,
      odometer: input.odometer ?? 0,
      odometer_unit: FleetVehicleModel.toOdooOdometerUnit(input.odometerUnit),
      active: input.active ?? true,
    });

    const created = await this.client.read<OdooFleetVehicleRecord>(
      this.vehicleModelName,
      [createdId],
      ['id', 'name', 'license_plate', 'odometer', 'odometer_unit', 'active']
    );

    if (created.length === 0) {
      throw new Error(`FleetVehicleModel.ensureExists: Created vehicle not readable: id=${createdId}`);
    }

    return { vehicle: FleetVehicleModel.toDomain(created[0]), created: true };
  }

  /**
   * Update vehicle odometer.
   *
   * In Odoo, odometer history is typically stored in `fleet.vehicle.odometer`.
   * This method creates an odometer entry and also syncs the vehicle's current
   * odometer field for convenience.
   *
   * @param vehicleId - Vehicle record ID
   * @param value - Odometer reading
   */
  async updateOdometer(vehicleId: number, value: number): Promise<void> {
    const today = FleetVehicleModel.todayIsoDate();

    await this.client.create(this.odometerModelName, {
      vehicle_id: vehicleId,
      date: today,
      value,
    });

    await this.client.write(this.vehicleModelName, [vehicleId], {
      odometer: value,
    });
  }

  private async getOrCreateDefaultVehicleModelId(): Promise<number> {
    const existing = await this.client.searchRead<OdooFleetVehicleModelRecord>(
      this.vehicleModelModelName,
      [],
      ['id', 'name'],
      { limit: 1 }
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const brandId = await this.getOrCreateDefaultBrandId();

    return this.client.create(this.vehicleModelModelName, {
      name: 'Automation Test Model',
      brand_id: brandId,
    });
  }

  private async getOrCreateDefaultBrandId(): Promise<number> {
    const brands = await this.client.searchRead<{ id: number; name: string }>(
      this.vehicleBrandModelName,
      [],
      ['id', 'name'],
      { limit: 1 }
    );

    if (brands.length > 0) {
      return brands[0].id;
    }

    return this.client.create(this.vehicleBrandModelName, {
      name: 'Automation Test Brand',
    });
  }

  private static toDomain(record: OdooFleetVehicleRecord): FleetVehicle {
    const name = record.name ?? '';
    const licensePlate = record.license_plate ?? '';

    if (!record.id || !name || !licensePlate) {
      throw new Error('FleetVehicleModel: Unexpected vehicle record shape from Odoo');
    }

    return {
      id: record.id,
      name,
      licensePlate,
      odometer: record.odometer ?? 0,
      odometerUnit: FleetVehicleModel.fromOdooOdometerUnit(record.odometer_unit),
      active: record.active,
    };
  }

  private static fromOdooOdometerUnit(unit: OdooFleetVehicleRecord['odometer_unit']): FleetVehicle['odometerUnit'] {
    if (unit === 'miles') return 'miles';
    if (unit === 'kilometers') return 'kilometers';
    return undefined;
  }

  private static toOdooOdometerUnit(unit: FleetVehicle['odometerUnit']): OdooFleetVehicleRecord['odometer_unit'] {
    if (unit === 'miles') return 'miles';
    if (unit === 'kilometers') return 'kilometers';
    return undefined;
  }

  /**
   * The license plate the framework uses for a test vehicle name, e.g. "Truck 01" -> "TRUCK-01".
   */
  static licensePlateFor(name: string): string {
    // Keep it deterministic and compatible with Odoo constraints.
    return name.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 16) || 'AUTO-TEST';
  }

  private static todayIsoDate(): `${number}-${number}-${number}` {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}` as IsoDateString;
  }
}

export default FleetVehicleModel;
