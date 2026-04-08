/**
 * EldProvider interface for pluggable ELD integrations.
 */

import type { DutyStatusEvent } from '../../types/hos';

export interface EldProvider {
  /** Connect the provider for a vehicle. */
  connect(vehicleId: string): Promise<void>;
  /** Disconnect and release any resources. */
  disconnect(): Promise<void>;
  /** Emit a duty status event. */
  emitDutyStatus(event: DutyStatusEvent): Promise<void>;
  /** Simulate driving for a number of minutes. */
  simulateDriving(driverId: string, minutes: number): Promise<void>;
  /** Simulate off-duty for a number of minutes. */
  simulateOffDuty(driverId: string, minutes: number): Promise<void>;
  /** Get all duty status events for a driver. */
  getEvents(driverId: string): Promise<DutyStatusEvent[]>;
  /** Inject a malfunction event for demo purposes. */
  injectMalfunction(
    driverId: string,
    type: 'POWER' | 'ENGINE_SYNC' | 'POSITIONING' | 'DATA_DIAGNOSTIC'
  ): Promise<void>;
  /** Generate DOT inspection data for a driver. */
  generateDotInspectionData(
    driverId: string,
    days: number
  ): Promise<{ format: 'USB' | 'BLUETOOTH'; payload: string }>;
}
