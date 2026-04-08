/**
 * Fleet Endpoints
 * Typed wrapper for Fleet module API operations
 */

import { OdooJsonRpcClient } from '../clients/OdooJsonRpcClient';
import { Vehicle, VehicleCreateData, VehicleUpdateData, OdooDomain } from '../../types/api';

// Odoo model name for vehicles
const VEHICLE_MODEL = 'fleet.vehicle';
const VEHICLE_MODEL_MODEL = 'fleet.vehicle.model';

// Default fields to fetch for vehicle records
const DEFAULT_VEHICLE_FIELDS = [
  'id',
  'name',
  'license_plate',
  'model_id',
  'model_year',
  'driver_id',
  'fuel_type',
  'odometer',
  'odometer_unit',
  'acquisition_date',
  'car_value',
  'residual_value',
  'state_id',
  'active',
  'vin_sn',
  'color',
  'seats',
  'doors',
  'transmission',
  'category_id',
  'company_id',
];

/**
 * Fleet API Endpoints
 * Provides typed methods for Fleet module CRUD operations
 */
export class FleetEndpoints {
  private defaultModelId?: number;

  constructor(private client: OdooJsonRpcClient) {}

  // ==========================================================================
  // Vehicle Model Operations (for model_id requirement)
  // ==========================================================================

  /**
   * Get or create a default vehicle model for testing
   * @returns Model ID
   */
  async getOrCreateDefaultModel(): Promise<number> {
    if (this.defaultModelId) {
      return this.defaultModelId;
    }

    // Try to find any existing model
    const models = await this.client.searchRead<{ id: number; name: string }>(
      VEHICLE_MODEL_MODEL,
      [],
      ['id', 'name'],
      { limit: 1 }
    );

    if (models.length > 0) {
      this.defaultModelId = models[0].id;
      return this.defaultModelId;
    }

    // Create a test model if none exists
    // First need a brand
    const brandId = await this.getOrCreateDefaultBrand();
    
    this.defaultModelId = await this.client.create(VEHICLE_MODEL_MODEL, {
      name: 'Test Model',
      brand_id: brandId,
    });

    return this.defaultModelId;
  }

  /**
   * Get or create a default vehicle brand for testing
   * @returns Brand ID
   */
  private async getOrCreateDefaultBrand(): Promise<number> {
    const brands = await this.client.searchRead<{ id: number; name: string }>(
      'fleet.vehicle.model.brand',
      [],
      ['id', 'name'],
      { limit: 1 }
    );

    if (brands.length > 0) {
      return brands[0].id;
    }

    return this.client.create('fleet.vehicle.model.brand', {
      name: 'Test Brand',
    });
  }

  // ==========================================================================
  // Vehicle Operations
  // ==========================================================================

  /**
   * Get all vehicles with optional filters
   * @param filters - Odoo domain filters
   * @param options - Pagination options
   */
  async getVehicles(
    filters: OdooDomain = [],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<Vehicle[]> {
    return this.client.searchRead<Vehicle>(
      VEHICLE_MODEL,
      filters,
      DEFAULT_VEHICLE_FIELDS,
      options
    );
  }

  /**
   * Get a vehicle by ID
   * @param id - Vehicle ID
   */
  async getVehicleById(id: number): Promise<Vehicle | null> {
    const vehicles = await this.client.read<Vehicle>(
      VEHICLE_MODEL,
      [id],
      DEFAULT_VEHICLE_FIELDS
    );
    return vehicles.length > 0 ? vehicles[0] : null;
  }

  /**
   * Get a vehicle by license plate
   * @param plate - License plate number
   */
  async getVehicleByPlate(plate: string): Promise<Vehicle | null> {
    const vehicles = await this.client.searchRead<Vehicle>(
      VEHICLE_MODEL,
      [['license_plate', '=', plate]],
      DEFAULT_VEHICLE_FIELDS,
      { limit: 1 }
    );
    return vehicles.length > 0 ? vehicles[0] : null;
  }

  /**
   * Search vehicles by partial license plate match
   * @param platePattern - Partial license plate (uses ilike)
   */
  async searchVehiclesByPlate(platePattern: string): Promise<Vehicle[]> {
    return this.client.searchRead<Vehicle>(
      VEHICLE_MODEL,
      [['license_plate', 'ilike', platePattern]],
      DEFAULT_VEHICLE_FIELDS
    );
  }

  /**
   * Create a new vehicle
   * @param data - Vehicle data (model_id will be auto-assigned if not provided)
   * @returns Created vehicle ID
   */
  async createVehicle(data: VehicleCreateData): Promise<number> {
    // Auto-assign model_id if not provided (required field in Odoo)
    const vehicleData: Record<string, unknown> = { ...data };
    if (!vehicleData.model_id) {
      vehicleData.model_id = await this.getOrCreateDefaultModel();
    }
    return this.client.create(VEHICLE_MODEL, vehicleData);
  }

  /**
   * Update an existing vehicle
   * @param id - Vehicle ID
   * @param data - Fields to update
   * @returns True if successful
   */
  async updateVehicle(id: number, data: VehicleUpdateData): Promise<boolean> {
    return this.client.write(VEHICLE_MODEL, [id], data as unknown as Record<string, unknown>);
  }

  /**
   * Delete a vehicle
   * @param id - Vehicle ID
   * @returns True if successful
   */
  async deleteVehicle(id: number): Promise<boolean> {
    return this.client.unlink(VEHICLE_MODEL, [id]);
  }

  /**
   * Delete multiple vehicles
   * @param ids - Vehicle IDs
   * @returns True if successful
   */
  async deleteVehicles(ids: number[]): Promise<boolean> {
    if (ids.length === 0) return true;
    return this.client.unlink(VEHICLE_MODEL, ids);
  }

  /**
   * Count vehicles matching filters
   * @param filters - Odoo domain filters
   */
  async countVehicles(filters: OdooDomain = []): Promise<number> {
    return this.client.searchCount(VEHICLE_MODEL, filters);
  }

  /**
   * Get active vehicles only
   */
  async getActiveVehicles(): Promise<Vehicle[]> {
    return this.getVehicles([['active', '=', true]]);
  }

  /**
   * Get vehicles by driver ID
   * @param driverId - Driver partner ID
   */
  async getVehiclesByDriver(driverId: number): Promise<Vehicle[]> {
    return this.getVehicles([['driver_id', '=', driverId]]);
  }

  /**
   * Get vehicles by fuel type
   * @param fuelType - Fuel type
   */
  async getVehiclesByFuelType(fuelType: Vehicle['fuel_type']): Promise<Vehicle[]> {
    return this.getVehicles([['fuel_type', '=', fuelType]]);
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Create multiple vehicles
   * @param dataList - Array of vehicle data
   * @returns Array of created vehicle IDs
   */
  async createVehiclesBatch(dataList: VehicleCreateData[]): Promise<number[]> {
    const ids: number[] = [];
    for (const data of dataList) {
      const id = await this.createVehicle(data);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Delete vehicles by license plate pattern
   * @param platePattern - Pattern to match (ilike)
   * @returns Number of deleted vehicles
   */
  async deleteVehiclesByPlatePattern(platePattern: string): Promise<number> {
    const vehicles = await this.searchVehiclesByPlate(platePattern);
    const ids = vehicles.map(v => v.id!).filter(id => id !== undefined);
    if (ids.length > 0) {
      await this.deleteVehicles(ids);
    }
    return ids.length;
  }

  // ==========================================================================
  // Cleanup Utilities (for test teardown)
  // ==========================================================================

  /**
   * Delete all test vehicles (matching a test prefix pattern)
   * @param testPrefix - Prefix to identify test data (default: 'MD-TEST-')
   */
  async cleanupTestVehicles(testPrefix: string = 'MD-TEST-'): Promise<number> {
    return this.deleteVehiclesByPlatePattern(testPrefix);
  }
}

export default FleetEndpoints;
