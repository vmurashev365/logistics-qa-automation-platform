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
   * Get a vehicle by its Odoo `name`.
   * @param name - Vehicle display name
   * @throws If no matching vehicle exists
   */
  async getByName(name: string): Promise<FleetVehicle> {
    const records = await this.client.searchRead<OdooFleetVehicleRecord>(
      this.vehicleModelName,
      [['name', '=', name]],
      ['id', 'name', 'license_plate', 'odometer', 'odometer_unit', 'active'],
      { limit: 1 }
    );

    if (records.length === 0) {
      throw new Error(`FleetVehicleModel.getByName: Vehicle not found: ${name}`);
    }

    return FleetVehicleModel.toDomain(records[0]);
  }

  /**
   * Ensure a fleet vehicle exists. If not found by name, it is created.
   *
   * Odoo Fleet requires `model_id`, which is auto-provisioned for test usage.
   * @param input - Vehicle properties
   */
  async ensureExists(input: EnsureFleetVehicleInput): Promise<FleetVehicle> {
    try {
      return await this.getByName(input.name);
    } catch {
      const modelId = await this.getOrCreateDefaultVehicleModelId();
      const createdId = await this.client.create(this.vehicleModelName, {
        name: input.name,
        license_plate: input.licensePlate ?? FleetVehicleModel.deriveLicensePlate(input.name),
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

      return FleetVehicleModel.toDomain(created[0]);
    }
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

  private static deriveLicensePlate(name: string): string {
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
