/**
 * Deterministic virtual clock for demo and compliance testing.
 *
 * Use this instead of real-time waits to simulate long durations instantly.
 */

export interface TimeSource {
  /** Returns the current epoch time in milliseconds. */
  nowEpochMs(): number;
}

export class VirtualClock implements TimeSource {
  private currentEpochMs: number;

  /**
   * Create a VirtualClock starting at a specific epoch time.
   * @param startEpochMs - Initial epoch time in milliseconds.
   */
  constructor(startEpochMs: number) {
    if (!Number.isFinite(startEpochMs) || startEpochMs < 0) {
      throw new Error(`Invalid startEpochMs: ${String(startEpochMs)}`);
    }
    this.currentEpochMs = startEpochMs;
  }

  /** Returns the current epoch time in milliseconds. */
  nowEpochMs(): number {
    return this.currentEpochMs;
  }

  /**
   * Advance the clock by a number of minutes.
   * @param min - Minutes to advance (must be integer >= 0).
   */
  advanceMinutes(min: number): void {
    if (!Number.isInteger(min) || min < 0) {
      throw new Error(`Invalid minutes to advance: ${String(min)}`);
    }
    this.currentEpochMs += min * 60 * 1000;
  }

  /**
   * Set the clock to a specific epoch time in milliseconds.
   * @param ts - Epoch time in milliseconds.
   */
  setEpochMs(ts: number): void {
    if (!Number.isFinite(ts) || ts < 0) {
      throw new Error(`Invalid epoch ms: ${String(ts)}`);
    }
    this.currentEpochMs = ts;
  }
}
