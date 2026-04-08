/**
 * In-memory deterministic ELD mock client.
 */

import type { DutyStatusEvent } from '../../types/hos';
import type { EldProvider } from './EldProvider';
import type { TimeSource } from '../../helpers/VirtualClock';

interface EldMalfunctionEvent {
  tsEpochMs: number;
  driverId: string;
  type: 'POWER' | 'ENGINE_SYNC' | 'POSITIONING' | 'DATA_DIAGNOSTIC';
}

export class EldMockClient implements EldProvider {
  private readonly clock: TimeSource;
  private readonly eventsByDriver = new Map<string, DutyStatusEvent[]>();
  private readonly malfunctions: EldMalfunctionEvent[] = [];
  private connectedVehicleId: string | undefined;

  constructor(clock: TimeSource) {
    this.clock = clock;
  }

  async connect(vehicleId: string): Promise<void> {
    if (!vehicleId.trim()) {
      throw new Error('vehicleId is required to connect ELD mock');
    }
    this.connectedVehicleId = vehicleId;
  }

  async disconnect(): Promise<void> {
    this.connectedVehicleId = undefined;
  }

  async emitDutyStatus(event: DutyStatusEvent): Promise<void> {
    this.ensureConnected();
    this.validateEvent(event);

    const list = this.eventsByDriver.get(event.driverId) ?? [];
    const last = list[list.length - 1];
    if (last && event.tsEpochMs < last.tsEpochMs) {
      throw new Error('Duty status events must be emitted in chronological order');
    }

    list.push({ ...event });
    this.eventsByDriver.set(event.driverId, list);
  }

  async simulateDriving(driverId: string, minutes: number): Promise<void> {
    this.ensureConnected();
    this.validateMinutes(minutes, 'simulateDriving');

    const start = this.clock.nowEpochMs();
    await this.emitDutyStatus({
      tsEpochMs: start,
      driverId,
      status: 'DRIVING',
      source: 'eld',
    });

    this.clockAdvance(minutes);
  }

  async simulateOffDuty(driverId: string, minutes: number): Promise<void> {
    this.ensureConnected();
    this.validateMinutes(minutes, 'simulateOffDuty');

    const start = this.clock.nowEpochMs();
    await this.emitDutyStatus({
      tsEpochMs: start,
      driverId,
      status: 'OFF_DUTY',
      source: 'eld',
    });

    this.clockAdvance(minutes);
  }

  async getEvents(driverId: string): Promise<DutyStatusEvent[]> {
    return [...(this.eventsByDriver.get(driverId) ?? [])];
  }

  async injectMalfunction(
    driverId: string,
    type: 'POWER' | 'ENGINE_SYNC' | 'POSITIONING' | 'DATA_DIAGNOSTIC'
  ): Promise<void> {
    this.ensureConnected();
    if (!driverId.trim()) {
      throw new Error('driverId is required for ELD malfunction injection');
    }

    this.malfunctions.push({
      tsEpochMs: this.clock.nowEpochMs(),
      driverId,
      type,
    });
  }

  async generateDotInspectionData(
    driverId: string,
    days: number
  ): Promise<{ format: 'USB' | 'BLUETOOTH'; payload: string }> {
    if (!Number.isInteger(days) || days <= 0) {
      throw new Error(`Invalid days: ${String(days)}`);
    }

    const events = this.eventsByDriver.get(driverId) ?? [];
    const cutoffMs = this.clock.nowEpochMs() - days * 24 * 60 * 60 * 1000;

    const exportPayload = {
      driverId,
      generatedAtEpochMs: this.clock.nowEpochMs(),
      days,
      events: events.filter(e => e.tsEpochMs >= cutoffMs),
      malfunctions: this.malfunctions.filter(m => m.driverId === driverId && m.tsEpochMs >= cutoffMs),
      vehicleId: this.connectedVehicleId ?? 'UNKNOWN',
    };

    return {
      format: 'USB',
      payload: JSON.stringify(exportPayload, null, 2),
    };
  }

  private ensureConnected(): void {
    if (!this.connectedVehicleId) {
      throw new Error('ELD mock not connected. Call connect(vehicleId) first.');
    }
  }

  private validateEvent(event: DutyStatusEvent): void {
    if (!event.driverId.trim()) {
      throw new Error('DutyStatusEvent.driverId is required');
    }
    if (!Number.isFinite(event.tsEpochMs) || event.tsEpochMs < 0) {
      throw new Error('DutyStatusEvent.tsEpochMs must be a non-negative number');
    }
  }

  private validateMinutes(minutes: number, label: string): void {
    if (!Number.isInteger(minutes) || minutes < 0) {
      throw new Error(`Invalid minutes for ${label}: ${String(minutes)}`);
    }
  }

  private clockAdvance(minutes: number): void {
    if (minutes === 0) return;
    const maybeAdvanceableClock = this.clock as TimeSource & {
      advanceMinutes?: (min: number) => void;
    };

    if (typeof maybeAdvanceableClock.advanceMinutes === 'function') {
      maybeAdvanceableClock.advanceMinutes(minutes);
      return;
    }
    throw new Error('TimeSource does not support advanceMinutes; use VirtualClock');
  }
}
