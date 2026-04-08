/**
 * FleetFuelLogModel
 *
 * Typed model adapter for creating and verifying fuel logs.
 * Normalizes Odoo's native liters/pricing into trucking-friendly gallons.
 */

import { OdooJsonRpcClient } from '../../clients/OdooJsonRpcClient';
import { OdooApiError } from '../../clients/OdooJsonRpcClient';
import type { CreateFuelLogInput, FuelLog, IsoDateString } from '../../../types/fleet';
import { dollarsToCents, mulToCents } from '../../../helpers/money';

interface OdooFuelLogRecord {
  id: number;
  vehicle_id: [number, string] | number;
  date?: string;
  liter?: number;
  price_per_liter?: number;
  amount?: number;
  odometer?: number;
}

/**
 * Configuration options to support OCA/community variations.
 */
export interface FleetFuelLogModelOptions {
  fuelLogModelName?: string;
  /**
   * Fallback model used when the fuel-log model is not installed.
   * Defaults to `fleet.vehicle.log.services`.
   */
  fallbackServiceModelName?: string;
}

/**
 * Typed adapter for fuel logs.
 */
export class FleetFuelLogModel {
  private readonly fuelLogModelName: string;
  private readonly fallbackServiceModelName: string;

  private backend?: 'fuel' | 'service';
  private fallbackServiceFields?: Set<string>;

  /**
   * Create a FleetFuelLogModel.
   * @param client - Authenticated Odoo JSON-RPC client
   * @param options - Optional model name overrides
   */
  constructor(
    private readonly client: OdooJsonRpcClient,
    options: FleetFuelLogModelOptions = {}
  ) {
    this.fuelLogModelName = options.fuelLogModelName ?? 'fleet.vehicle.log.fuel';
    this.fallbackServiceModelName = options.fallbackServiceModelName ?? 'fleet.vehicle.log.services';
  }

  /**
   * Create a fuel log entry.
   *
   * Odoo Fleet uses liters internally (`liter`, `price_per_liter`). This adapter
   * accepts trucking-friendly gallons & price-per-gallon and persists an
   * equivalent record.
   *
   * @param input - Fuel log data
   */
  async createFuelLog(input: CreateFuelLogInput): Promise<FuelLog> {
    await this.resolveBackend();
    if (input.gallons <= 0) {
      throw new Error(`FleetFuelLogModel.createFuelLog: gallons must be > 0 (got ${input.gallons})`);
    }
    if (!Number.isInteger(input.pricePerGallonCents) || input.pricePerGallonCents <= 0) {
      throw new Error(
        `FleetFuelLogModel.createFuelLog: pricePerGallonCents must be an integer > 0 (got ${String(input.pricePerGallonCents)})`
      );
    }

    const date = input.date ?? FleetFuelLogModel.todayIsoDate();

    const amountCents = mulToCents(input.gallons, input.pricePerGallonCents);
    const amountDollars = amountCents / 100;

    if (this.backend === 'fuel') {
      const liters = FleetFuelLogModel.gallonsToLiters(input.gallons);
      const pricePerGallonDollars = input.pricePerGallonCents / 100;
      const pricePerLiter = FleetFuelLogModel.pricePerGallonToPerLiter(pricePerGallonDollars);

      const createdId = await this.client.create(this.fuelLogModelName, {
        vehicle_id: input.vehicleId,
        date,
        liter: liters,
        price_per_liter: pricePerLiter,
        amount: amountDollars,
        ...(typeof input.odometer === 'number' ? { odometer: input.odometer } : {}),
      });

      const records = await this.client.read<OdooFuelLogRecord>(
        this.fuelLogModelName,
        [createdId],
        ['id', 'vehicle_id', 'date', 'liter', 'price_per_liter', 'amount', 'odometer']
      );

      if (records.length === 0) {
        throw new Error(`FleetFuelLogModel.createFuelLog: Created fuel log not readable: id=${createdId}`);
      }

      return FleetFuelLogModel.toDomain(records[0]);
    }

    // Odoo Community fallback: store fuel event as a service log entry.
    const description = FleetFuelLogModel.formatFallbackDescription(input.gallons, input.pricePerGallonCents / 100);

    const fields = await this.getFallbackServiceFields();
    const payload: Record<string, unknown> = {
      vehicle_id: input.vehicleId,
      date,
      description,
    };

    if (fields.has('service_type_id')) {
      payload.service_type_id = await this.getOrCreateServiceTypeId('Fuel');
    }

    // Cost field name varies across modules; prefer amount/cost_amount if present.
    if (fields.has('amount')) {
      payload.amount = amountDollars;
    } else if (fields.has('cost_amount')) {
      payload.cost_amount = amountDollars;
    }

    if (typeof input.odometer === 'number' && fields.has('odometer')) {
      payload.odometer = input.odometer;
    }

    const createdId = await this.client.create(this.fallbackServiceModelName, payload);

    const readFields = await this.getFallbackServiceReadFields();

    const records = await this.client.read<{ id: number; vehicle_id: [number, string] | number; date?: string; description?: string; amount?: number; cost_amount?: number; odometer?: number }>(
      this.fallbackServiceModelName,
      [createdId],
      readFields
    );

    if (records.length === 0) {
      throw new Error(`FleetFuelLogModel.createFuelLog: Created fallback fuel log not readable: id=${createdId}`);
    }

    const parsed = FleetFuelLogModel.parseFallbackDescription(records[0].description);
    const vehicleId = FleetFuelLogModel.many2OneId(records[0].vehicle_id);
    const storedAmount = records[0].amount ?? records[0].cost_amount;
    const storedAmountCents = typeof storedAmount === 'number' ? dollarsToCents(storedAmount) : undefined;
    const pricePerGallonCents = dollarsToCents(parsed.pricePerGallon);
    const totalCostCents = storedAmountCents ?? amountCents;

    return {
      id: records[0].id,
      vehicleId,
      date: FleetFuelLogModel.ensureIsoDate(records[0].date),
      gallons: parsed.gallons,
      pricePerGallonCents,
      totalCostCents,
      odometer: records[0].odometer,
    };
  }

  /**
   * Fetch the most recent fuel log for a vehicle (by date desc, then id desc).
   * @param vehicleId - Vehicle record ID
   */
  async getLatestForVehicle(vehicleId: number): Promise<FuelLog> {
    await this.resolveBackend();

    if (this.backend === 'fuel') {
      const records = await this.client.searchRead<OdooFuelLogRecord>(
        this.fuelLogModelName,
        [['vehicle_id', '=', vehicleId]],
        ['id', 'vehicle_id', 'date', 'liter', 'price_per_liter', 'amount', 'odometer'],
        { limit: 1, order: 'date desc, id desc' }
      );

      if (records.length === 0) {
        throw new Error(`FleetFuelLogModel.getLatestForVehicle: No fuel logs found for vehicleId=${vehicleId}`);
      }

      return FleetFuelLogModel.toDomain(records[0]);
    }

    const records = await this.client.searchRead<{ id: number; vehicle_id: [number, string] | number; date?: string; description?: string; cost_amount?: number; odometer?: number }>(
      this.fallbackServiceModelName,
      [
        ['vehicle_id', '=', vehicleId],
        ['description', 'ilike', 'Fuel (' ],
      ],
      (await this.getFallbackServiceReadFields()),
      { limit: 1, order: 'date desc, id desc' }
    );

    if (records.length === 0) {
      throw new Error(`FleetFuelLogModel.getLatestForVehicle: No fallback fuel logs found for vehicleId=${vehicleId}`);
    }

    const parsed = FleetFuelLogModel.parseFallbackDescription(records[0].description);

    const pricePerGallonCents = dollarsToCents(parsed.pricePerGallon);
    const recordAmount = (records[0] as { amount?: number; cost_amount?: number }).amount ??
      (records[0] as { amount?: number; cost_amount?: number }).cost_amount;

    const totalCostCents =
      typeof recordAmount === 'number'
        ? dollarsToCents(recordAmount)
        : mulToCents(parsed.gallons, pricePerGallonCents);

    return {
      id: records[0].id,
      vehicleId: FleetFuelLogModel.many2OneId(records[0].vehicle_id),
      date: FleetFuelLogModel.ensureIsoDate(records[0].date),
      gallons: parsed.gallons,
      pricePerGallonCents,
      totalCostCents,
      odometer: records[0].odometer,
    };
  }

  /**
   * Get available fields for the fallback service model.
   */
  private async getFallbackServiceFields(): Promise<Set<string>> {
    if (this.fallbackServiceFields) {
      return this.fallbackServiceFields;
    }

    const defs = await this.client.fieldsGet(this.fallbackServiceModelName, [
      'id',
      'vehicle_id',
      'date',
      'description',
      'service_type_id',
      'odometer',
      'amount',
      'cost_amount',
    ]);

    this.fallbackServiceFields = new Set(Object.keys(defs));
    return this.fallbackServiceFields;
  }

  private async getFallbackServiceReadFields(): Promise<string[]> {
    const fields = await this.getFallbackServiceFields();
    const readFields: string[] = ['id', 'vehicle_id', 'date', 'description'];
    if (fields.has('service_type_id')) {
      readFields.push('service_type_id');
    }
    if (fields.has('odometer')) {
      readFields.push('odometer');
    }
    if (fields.has('amount')) {
      readFields.push('amount');
    }
    if (fields.has('cost_amount')) {
      readFields.push('cost_amount');
    }
    return readFields;
  }

  /**
   * Get or create a Fleet Service Type by name.
   * Some Odoo installations require `service_type_id` for service logs.
   */
  private async getOrCreateServiceTypeId(name: string): Promise<number> {
    const modelName = 'fleet.service.type';

    const existing = await this.client.searchRead<{ id: number; name: string }>(
      modelName,
      [['name', '=', name]],
      ['id', 'name'],
      { limit: 1 }
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    // If a service type already exists in the DB, reuse it rather than creating.
    const anyType = await this.client.searchRead<{ id: number; name: string }>(
      modelName,
      [],
      ['id', 'name'],
      { limit: 1 }
    );

    if (anyType.length > 0) {
      return anyType[0].id;
    }

    // Create a minimal valid service type. Some installations require `category`.
    const defs = await this.client.fieldsGet(modelName, ['name', 'category']);
    const payload: Record<string, unknown> = { name };

    if (defs['category']) {
      const selection = defs['category'].selection;
      const first = Array.isArray(selection) && selection.length > 0 ? selection[0] : undefined;
      const value = Array.isArray(first) && typeof first[0] === 'string' ? first[0] : 'service';
      payload.category = value;
    }

    return this.client.create(modelName, payload);
  }

  /**
   * Determine which backend to use (native fuel model vs. Community fallback).
   */
  private async resolveBackend(): Promise<void> {
    if (this.backend) {
      return;
    }

    try {
      await this.client.fieldsGet(this.fuelLogModelName, ['id']);
      this.backend = 'fuel';
    } catch (error) {
      if (FleetFuelLogModel.isMissingModelError(error, this.fuelLogModelName)) {
        this.backend = 'service';
        return;
      }
      throw error;
    }
  }

private static isMissingModelError(error: unknown, modelName: string): boolean {
  const haystack = FleetFuelLogModel.stringifyError(error).toLowerCase();

  // Never treat auth/access/permission failures as a missing-model signal.
  if (
    haystack.includes('accesserror') ||
    haystack.includes('access denied') ||
    haystack.includes('permission') ||
    haystack.includes('not allowed') ||
    haystack.includes('authentication') ||
    haystack.includes('not authenticated')
  ) {
    return false;
  }

  if (error instanceof OdooApiError) {
    const exceptionType = error.getExceptionType();
    if (exceptionType === 'AccessError' || exceptionType === 'AuthenticationError') {
      return false;
    }

    const dataName = (error.data?.name ?? '').toLowerCase();
    const dataMessage = (error.data?.message ?? '').toLowerCase();
    const dataArgs = Array.isArray(error.data?.arguments)
      ? error.data.arguments.map((value) => String(value).toLowerCase())
      : [];

    const model = modelName.toLowerCase();

    // Common Odoo missing-model signal: KeyError with the model name.
    if (dataName.includes('keyerror')) {
      if (dataMessage.includes(model) || dataArgs.some((arg) => arg.includes(model))) {
        return true;
      }
      if (haystack.includes(`keyerror: '${model}'`)) {
        return true;
      }
    }

    // Other variants may include explicit unknown-model wording.
    if (dataMessage.includes('unknown model') || dataMessage.includes('model does not exist')) {
      return true;
    }
  }

  const model = modelName.toLowerCase();
  const mentionsModel = haystack.includes(model);

  if (mentionsModel) {
    return (
      haystack.includes('unknown model') ||
      haystack.includes('model does not exist') ||
      haystack.includes('keyerror')
    );
  }

  return haystack.includes('unknown model') || haystack.includes('model does not exist');
}


  private static stringifyError(error: unknown): string {
    if (error instanceof OdooApiError) {
      const dataName = error.data?.name;
      const dataMessage = error.data?.message;
      const args = error.data?.arguments;
      const debug = error.data?.debug;
      const details = [
        dataName ? `data.name=${String(dataName)}` : undefined,
        dataMessage ? `data.message=${String(dataMessage)}` : undefined,
        args ? `data.arguments=${JSON.stringify(args)}` : undefined,
        debug ? `data.debug=${String(debug)}` : undefined,
      ].filter(Boolean);
      return `${error.name}: ${error.message}${details.length ? ` | ${details.join(' | ')}` : ''}`;
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private static formatFallbackDescription(gallons: number, pricePerGallon: number): string {
    // Keep this stable for parsing and reporting.
    return `Fuel (${gallons} gal @ ${pricePerGallon} per_gal)`;
  }

  private static parseFallbackDescription(description: string | undefined): { gallons: number; pricePerGallon: number } {
    if (!description) {
      throw new Error('FleetFuelLogModel: Missing fallback fuel description');
    }

    const match = description.match(/Fuel\s*\(([-\d.]+)\s*gal\s*@\s*([-\d.]+)\s*per_gal\)/i);
    if (!match) {
      throw new Error(`FleetFuelLogModel: Unexpected fallback description: ${description}`);
    }

    const gallons = Number(match[1]);
    const pricePerGallon = Number(match[2]);

    if (!Number.isFinite(gallons) || !Number.isFinite(pricePerGallon)) {
      throw new Error(`FleetFuelLogModel: Invalid parsed values from description: ${description}`);
    }

    return { gallons, pricePerGallon };
  }

  private static toDomain(record: OdooFuelLogRecord): FuelLog {
    const vehicleId = FleetFuelLogModel.many2OneId(record.vehicle_id);
    if (!vehicleId) {
      throw new Error('FleetFuelLogModel: Unexpected vehicle_id shape');
    }

    const date = FleetFuelLogModel.ensureIsoDate(record.date);

    const liters = record.liter ?? 0;
    const pricePerLiter = record.price_per_liter ?? 0;

    const gallons = FleetFuelLogModel.litersToGallons(liters);
    const pricePerGallonDollars = FleetFuelLogModel.pricePerLiterToPerGallon(pricePerLiter);

    const pricePerGallonCents = dollarsToCents(pricePerGallonDollars);
    const totalCostCents = dollarsToCents(record.amount ?? gallons * pricePerGallonDollars);

    return {
      id: record.id,
      vehicleId,
      date,
      gallons,
      pricePerGallonCents,
      totalCostCents,
      odometer: record.odometer,
    };
  }

  private static ensureIsoDate(value: string | undefined): IsoDateString {
    if (!value) {
      return FleetFuelLogModel.todayIsoDate();
    }

    // Odoo typically returns 'YYYY-MM-DD' for date fields.
    const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!match) {
      throw new Error(`FleetFuelLogModel: Expected ISO date string but got: ${value}`);
    }
    return value as IsoDateString;
  }

  private static many2OneId(value: [number, string] | number): number {
    if (typeof value === 'number') return value;
    return value[0];
  }

  private static todayIsoDate(): IsoDateString {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}` as IsoDateString;
  }

  private static gallonsToLiters(gallons: number): number {
    return gallons * 3.78541;
  }

  private static litersToGallons(liters: number): number {
    return liters / 3.78541;
  }

  private static pricePerGallonToPerLiter(pricePerGallon: number): number {
    return pricePerGallon / 3.78541;
  }

  private static pricePerLiterToPerGallon(pricePerLiter: number): number {
    return pricePerLiter * 3.78541;
  }
}

export default FleetFuelLogModel;
