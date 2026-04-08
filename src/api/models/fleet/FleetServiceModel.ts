/**
 * FleetServiceModel
 *
 * Typed model adapter for scheduling/recording service activities.
 */

import { OdooJsonRpcClient } from '../../clients/OdooJsonRpcClient';
import type { IsoDateString, ServiceActivity } from '../../../types/fleet';

/**
 * Configuration options to support OCA/community variations.
 */
export interface FleetServiceModelOptions {
  serviceModelName?: string;
  descriptionFieldName?: string;
  costFieldName?: string;
  notesFieldName?: string;
  dateFieldName?: string;
}

/**
 * Typed adapter for service activities.
 */
export class FleetServiceModel {
  private readonly serviceModelName: string;
  private readonly descriptionFieldName: string;
  private readonly costFieldName: string;
  private readonly notesFieldName: string;
  private readonly dateFieldName: string;

  private serviceModelFields?: Set<string>;

  /**
   * Create a FleetServiceModel.
   * @param client - Authenticated Odoo JSON-RPC client
   * @param options - Optional model/field overrides
   */
  constructor(
    private readonly client: OdooJsonRpcClient,
    options: FleetServiceModelOptions = {}
  ) {
    this.serviceModelName = options.serviceModelName ?? 'fleet.vehicle.log.services';
    this.descriptionFieldName = options.descriptionFieldName ?? 'description';
    this.costFieldName = options.costFieldName ?? 'cost_amount';
    this.notesFieldName = options.notesFieldName ?? 'notes';
    this.dateFieldName = options.dateFieldName ?? 'date';
  }

  /**
   * Schedule (or record) a service activity.
   * @param vehicleId - Vehicle record ID
   * @param type - Service type descriptor (e.g., "oil change")
   * @param cost - Service cost
   */
  async scheduleService(
    vehicleId: number,
    type: string,
    cost: number
  ): Promise<ServiceActivity> {
    const scheduledDate = FleetServiceModel.todayIsoDate();

    const fields = await this.getServiceModelFields();
    const payload: Record<string, unknown> = {
      vehicle_id: vehicleId,
      [this.dateFieldName]: scheduledDate,
      [this.descriptionFieldName]: type,
    };

    // Some Odoo installations require a Service Type for service logs.
    if (fields.has('service_type_id')) {
      payload.service_type_id = await this.getOrCreateServiceTypeId(type);
    }

    // Cost field differs by version/customization.
    if (fields.has(this.costFieldName)) {
      payload[this.costFieldName] = cost;
    } else if (fields.has('amount')) {
      payload.amount = cost;
    } else if (fields.has('cost_amount')) {
      payload.cost_amount = cost;
    }

    const createdId = await this.client.create(this.serviceModelName, payload);

    const readFields = await this.getServiceReadFields();
    const records = await this.client.read<Record<string, unknown>>(
      this.serviceModelName,
      [createdId],
      readFields
    );

    if (records.length === 0) {
      throw new Error(`FleetServiceModel.scheduleService: Created service not readable: id=${createdId}`);
    }

    return FleetServiceModel.toDomain(
      records[0],
      this.dateFieldName,
      this.descriptionFieldName,
      this.costFieldName,
      this.notesFieldName
    );
  }

  private static toDomain(
    record: Record<string, unknown>,
    dateFieldName: string,
    descriptionFieldName: string,
    costFieldName: string,
    notesFieldName: string
  ): ServiceActivity {
    const idValue = record['id'];
    if (typeof idValue !== 'number') {
      throw new Error('FleetServiceModel: Unexpected service record id type');
    }

    const vehicleRaw = record['vehicle_id'] as [number, string] | number;
    const vehicleId = FleetServiceModel.many2OneId(vehicleRaw);

    const dateValue = record[dateFieldName];

    const scheduledDate = FleetServiceModel.ensureIsoDate(typeof dateValue === 'string' ? dateValue : undefined);

    const serviceType = record[descriptionFieldName];

    const costCandidate = record[costFieldName] ?? record['amount'] ?? record['cost_amount'];
    const notes = record[notesFieldName];

    if (typeof serviceType !== 'string') {
      throw new Error('FleetServiceModel: Unexpected service description type');
    }
    if (typeof costCandidate !== 'number') {
      throw new Error('FleetServiceModel: Unexpected service cost type');
    }

    return {
      id: idValue,
      vehicleId,
      scheduledDate,
      serviceType,
      cost: costCandidate,
      notes: typeof notes === 'string' ? notes : undefined,
    };
  }

  private async getServiceModelFields(): Promise<Set<string>> {
    if (this.serviceModelFields) {
      return this.serviceModelFields;
    }

    const defs = await this.client.fieldsGet(this.serviceModelName, [
      'id',
      'vehicle_id',
      this.dateFieldName,
      this.descriptionFieldName,
      this.costFieldName,
      'amount',
      'cost_amount',
      this.notesFieldName,
      'service_type_id',
    ]);

    this.serviceModelFields = new Set(Object.keys(defs));
    return this.serviceModelFields;
  }

  private async getServiceReadFields(): Promise<string[]> {
    const fields = await this.getServiceModelFields();
    const readFields: string[] = ['id', 'vehicle_id', this.dateFieldName, this.descriptionFieldName];

    if (fields.has(this.costFieldName)) {
      readFields.push(this.costFieldName);
    }
    if (fields.has('amount')) {
      readFields.push('amount');
    }
    if (fields.has('cost_amount')) {
      readFields.push('cost_amount');
    }
    if (fields.has(this.notesFieldName)) {
      readFields.push(this.notesFieldName);
    }
    return readFields;
  }

  /**
   * Get or create a Fleet Service Type by name.
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

  private static ensureIsoDate(value: string | undefined): IsoDateString {
    if (!value) {
      return FleetServiceModel.todayIsoDate();
    }

    const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!match) {
      throw new Error(`FleetServiceModel: Expected ISO date string but got: ${value}`);
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

export default FleetServiceModel;
