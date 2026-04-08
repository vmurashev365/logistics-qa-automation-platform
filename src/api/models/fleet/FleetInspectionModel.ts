/**
 * FleetInspectionModel
 *
 * Typed model adapter for vehicle inspections.
 * Designed to be OCA-ready: inspections are typically introduced via OCA modules.
 */

import { OdooJsonRpcClient } from '../../clients/OdooJsonRpcClient';
import { OdooApiError } from '../../clients/OdooJsonRpcClient';
import type { InspectionLog, InspectionResult, IsoDateString } from '../../../types/fleet';

interface OdooInspectionRecord {
  id: number;
  vehicle_id: [number, string] | number;
  date?: string;
  result?: string;
  notes?: string;
}

/**
 * Configuration options to support OCA/community variations.
 */
export interface FleetInspectionModelOptions {
  inspectionModelName?: string;
  resultFieldName?: string;
  notesFieldName?: string;
  /**
   * Fallback model used when the inspection model is not installed (Odoo Community).
   * Defaults to `fleet.vehicle.log.services`.
   */
  fallbackServiceModelName?: string;
}

/**
 * Typed adapter for inspection logs.
 */
export class FleetInspectionModel {
  private readonly inspectionModelName: string;
  private readonly resultFieldName: string;
  private readonly notesFieldName: string;
  private readonly fallbackServiceModelName: string;

  private backend?: 'inspection' | 'service';
  private fallbackServiceFields?: Set<string>;

  /**
   * Create a FleetInspectionModel.
   * @param client - Authenticated Odoo JSON-RPC client
   * @param options - Optional model/field name overrides for OCA differences
   */
  constructor(
    private readonly client: OdooJsonRpcClient,
    options: FleetInspectionModelOptions = {}
  ) {
    this.inspectionModelName = options.inspectionModelName ?? 'fleet.vehicle.log.inspection';
    this.resultFieldName = options.resultFieldName ?? 'result';
    this.notesFieldName = options.notesFieldName ?? 'notes';
    this.fallbackServiceModelName = options.fallbackServiceModelName ?? 'fleet.vehicle.log.services';
  }

  /**
   * Create an inspection record for a vehicle.
   * @param vehicleId - Vehicle record ID
   * @param result - Inspection result
   * @param notes - Optional notes
   */
  async createInspection(
    vehicleId: number,
    result: InspectionResult,
    notes?: string
  ): Promise<InspectionLog> {
    await this.resolveBackend();
    const date = FleetInspectionModel.todayIsoDate();

    if (this.backend === 'inspection') {
      const createdId = await this.client.create(this.inspectionModelName, {
        vehicle_id: vehicleId,
        date,
        [this.resultFieldName]: result,
        ...(notes ? { [this.notesFieldName]: notes } : {}),
      });

      const records = await this.client.read<OdooInspectionRecord>(
        this.inspectionModelName,
        [createdId],
        ['id', 'vehicle_id', 'date', this.resultFieldName, this.notesFieldName]
      );

      if (records.length === 0) {
        throw new Error(`FleetInspectionModel.createInspection: Created inspection not readable: id=${createdId}`);
      }

      return FleetInspectionModel.toDomain(records[0], this.resultFieldName, this.notesFieldName);
    }

    // Odoo Community fallback: persist an inspection as a service log entry.
    const description = FleetInspectionModel.formatFallbackDescription(result);

    const fields = await this.getFallbackServiceFields();
    const payload: Record<string, unknown> = {
      vehicle_id: vehicleId,
      date,
      description,
    };

    if (fields.has('service_type_id')) {
      payload.service_type_id = await this.getOrCreateServiceTypeId('Inspection');
    }
    if (notes && fields.has('notes')) {
      payload.notes = notes;
    }

    const createdId = await this.client.create(this.fallbackServiceModelName, {
      ...payload,
    });

    const readFields: string[] = ['id', 'vehicle_id', 'date', 'description'];
    if (fields.has('notes')) {
      readFields.push('notes');
    }

    const records = await this.client.read<{ id: number; vehicle_id: [number, string] | number; date?: string; description?: string; notes?: string }>(
      this.fallbackServiceModelName,
      [createdId],
      readFields
    );

    if (records.length === 0) {
      throw new Error(`FleetInspectionModel.createInspection: Created fallback inspection not readable: id=${createdId}`);
    }

    return {
      id: records[0].id,
      vehicleId: FleetInspectionModel.many2OneId(records[0].vehicle_id),
      date: FleetInspectionModel.ensureIsoDate(records[0].date),
      inspectionResult: FleetInspectionModel.parseFallbackDescription(records[0].description),
      notes: records[0].notes,
    };
  }

  /**
   * Fetch the latest inspection record for a vehicle.
   * @param vehicleId - Vehicle record ID
   */
  async getLatestForVehicle(vehicleId: number): Promise<InspectionLog> {
    await this.resolveBackend();

    if (this.backend === 'inspection') {
      const records = await this.client.searchRead<OdooInspectionRecord>(
        this.inspectionModelName,
        [['vehicle_id', '=', vehicleId]],
        ['id', 'vehicle_id', 'date', this.resultFieldName, this.notesFieldName],
        { limit: 1, order: 'date desc, id desc' }
      );

      if (records.length === 0) {
        throw new Error(`FleetInspectionModel.getLatestForVehicle: No inspection logs found for vehicleId=${vehicleId}`);
      }

      return FleetInspectionModel.toDomain(records[0], this.resultFieldName, this.notesFieldName);
    }

    const records = await this.client.searchRead<{ id: number; vehicle_id: [number, string] | number; date?: string; description?: string; notes?: string }>(
      this.fallbackServiceModelName,
      [
        ['vehicle_id', '=', vehicleId],
        ['description', 'ilike', 'Inspection (' ],
      ],
      (await this.getFallbackServiceReadFields()),
      { limit: 1, order: 'date desc, id desc' }
    );

    if (records.length === 0) {
      throw new Error(`FleetInspectionModel.getLatestForVehicle: No fallback inspection logs found for vehicleId=${vehicleId}`);
    }

    return {
      id: records[0].id,
      vehicleId: FleetInspectionModel.many2OneId(records[0].vehicle_id),
      date: FleetInspectionModel.ensureIsoDate(records[0].date),
      inspectionResult: FleetInspectionModel.parseFallbackDescription(records[0].description),
      notes: records[0].notes,
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
      'notes',
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
    if (fields.has('notes')) {
      readFields.push('notes');
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

    const anyType = await this.client.searchRead<{ id: number; name: string }>(
      modelName,
      [],
      ['id', 'name'],
      { limit: 1 }
    );

    if (anyType.length > 0) {
      return anyType[0].id;
    }

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
   * Determine which backend to use (OCA inspection model vs. Community fallback).
   */
  private async resolveBackend(): Promise<void> {
    if (this.backend) {
      return;
    }

    try {
      await this.client.fieldsGet(this.inspectionModelName, ['id']);
      this.backend = 'inspection';
    } catch (error) {
      if (FleetInspectionModel.isMissingModelError(error, this.inspectionModelName)) {
        this.backend = 'service';
        return;
      }
      throw error;
    }
  }

private static isMissingModelError(error: unknown, modelName: string): boolean {
  const haystack = FleetInspectionModel.stringifyError(error).toLowerCase();

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

    if (dataName.includes('keyerror')) {
      if (dataMessage.includes(model) || dataArgs.some((arg) => arg.includes(model))) {
        return true;
      }
      if (haystack.includes(`keyerror: '${model}'`)) {
        return true;
      }
    }

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

  private static formatFallbackDescription(result: InspectionResult): string {
    return `Inspection (${result})`;
  }

  private static parseFallbackDescription(description: string | undefined): InspectionResult {
    if (!description) {
      throw new Error('FleetInspectionModel: Missing fallback inspection description');
    }
    const match = description.match(/Inspection\s*\((pass|fail)\)/i);
    if (!match) {
      throw new Error(`FleetInspectionModel: Unexpected fallback description: ${description}`);
    }
    const value = match[1].toLowerCase();
    if (value === 'pass' || value === 'fail') {
      return value;
    }
    throw new Error(`FleetInspectionModel: Unexpected fallback result: ${value}`);
  }

  private static toDomain(
    record: OdooInspectionRecord,
    resultFieldName: string,
    notesFieldName: string
  ): InspectionLog {
    const vehicleId = FleetInspectionModel.many2OneId(record.vehicle_id);
    const date = FleetInspectionModel.ensureIsoDate(record.date);

    const resultValue = (record as unknown as Record<string, unknown>)[resultFieldName];
    const notesValue = (record as unknown as Record<string, unknown>)[notesFieldName];

    const inspectionResult = FleetInspectionModel.normalizeResult(resultValue);

    return {
      id: record.id,
      vehicleId,
      date,
      inspectionResult,
      notes: typeof notesValue === 'string' ? notesValue : undefined,
    };
  }

  private static normalizeResult(value: unknown): InspectionResult {
    if (value === 'pass' || value === 'fail') {
      return value;
    }

    // Some OCA modules use booleans or alternative values; keep strict mapping.
    if (value === true) return 'pass';
    if (value === false) return 'fail';

    throw new Error(`FleetInspectionModel: Unexpected inspection result value: ${String(value)}`);
  }

  private static ensureIsoDate(value: string | undefined): IsoDateString {
    if (!value) {
      return FleetInspectionModel.todayIsoDate();
    }

    const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!match) {
      throw new Error(`FleetInspectionModel: Expected ISO date string but got: ${value}`);
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
}

export default FleetInspectionModel;
