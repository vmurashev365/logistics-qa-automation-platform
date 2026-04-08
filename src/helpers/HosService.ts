/**
 * HosService orchestrates ELD events with HosCalculator.
 */

import type { EldProvider } from '../api/clients/EldProvider';
import type { HosConfig, HosStatus } from '../types/hos';
import type { TimeSource } from './VirtualClock';
import { HosCalculator } from './HosCalculator';

export class HosService {
  private readonly eldProvider: EldProvider;
  private readonly calculator: HosCalculator;
  private readonly config: HosConfig;
  private readonly timeSource: TimeSource;

  constructor(params: {
    eldProvider: EldProvider;
    calculator: HosCalculator;
    config: HosConfig;
    timeSource: TimeSource;
  }) {
    this.eldProvider = params.eldProvider;
    this.calculator = params.calculator;
    this.config = params.config;
    this.timeSource = params.timeSource;
  }

  /**
   * Compute HOS status for a driver at the current time.
   */
  async getHosStatus(driverId: string): Promise<HosStatus> {
    if (!driverId.trim()) {
      throw new Error('driverId is required for HOS status');
    }

    const events = await this.eldProvider.getEvents(driverId);
    return this.calculator.calculate(this.config, events, this.timeSource.nowEpochMs());
  }

  /**
   * Assert that no HOS violations are present for the driver.
   */
  async assertNoViolations(driverId: string): Promise<void> {
    const status = await this.getHosStatus(driverId);
    if (status.violations.length > 0) {
      const details = status.violations
        .map(v => `${v.rule}: ${v.message}`)
        .join('; ');
      throw new Error(`HOS violations detected for ${driverId}: ${details}`);
    }
  }
}
