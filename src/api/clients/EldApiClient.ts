/**
 * Placeholder for a real ELD API integration.
 *
 * TODO: Implement HTTP client integration and authentication.
 */

import type { DutyStatusEvent } from '../../types/hos';
import type { EldProvider } from './EldProvider';

export class EldApiClient implements EldProvider {
  async connect(_vehicleId: string): Promise<void> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async disconnect(): Promise<void> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async emitDutyStatus(_event: DutyStatusEvent): Promise<void> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async simulateDriving(_driverId: string, _minutes: number): Promise<void> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async simulateOffDuty(_driverId: string, _minutes: number): Promise<void> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async getEvents(_driverId: string): Promise<DutyStatusEvent[]> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async injectMalfunction(
    _driverId: string,
    _type: 'POWER' | 'ENGINE_SYNC' | 'POSITIONING' | 'DATA_DIAGNOSTIC'
  ): Promise<void> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }

  async generateDotInspectionData(
    _driverId: string,
    _days: number
  ): Promise<{ format: 'USB' | 'BLUETOOTH'; payload: string }> {
    throw new Error('EldApiClient is not implemented. Use ELD_MODE=mock for demo runs.');
  }
}
