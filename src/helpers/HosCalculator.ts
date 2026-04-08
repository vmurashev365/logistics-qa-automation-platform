/**
 * HosCalculator
 *
 * Deterministic Hours of Service calculator (FMCSA simplified, demo-grade).
 *
 * Rules implemented:
 * - 11-hour driving limit after 10 consecutive hours OFF_DUTY or SLEEPER.
 * - 14-hour duty window starts when driver goes ON_DUTY or DRIVING after qualifying rest.
 * - 30-minute break required after 8 hours of DRIVING since last qualifying break.
 * - 70-hour / 8-day cycle for ON_DUTY + DRIVING minutes.
 * - 34-hour restart resets the cycle after 34 consecutive hours OFF_DUTY/SLEEPER.
 */

import type {
  DutyStatus,
  DutyStatusEvent,
  HosAlert,
  HosConfig,
  HosRuleId,
  HosStatus,
  Severity,
} from '../types/hos';

const MINUTE_MS = 60 * 1000;
const DRIVE_LIMIT_MIN = 11 * 60;
const DUTY_WINDOW_MIN = 14 * 60;
const BREAK_AFTER_DRIVE_MIN = 8 * 60;
const RESTART_MIN = 34 * 60;
const QUALIFYING_REST_MIN = 10 * 60;
const QUALIFYING_BREAK_MIN = 30;

interface Segment {
  startEpochMs: number;
  endEpochMs: number;
  status: DutyStatus;
}

function isRestStatus(status: DutyStatus): boolean {
  return status === 'OFF_DUTY' || status === 'SLEEPER';
}

function isOnDutyStatus(status: DutyStatus): boolean {
  return status === 'ON_DUTY' || status === 'DRIVING';
}

function toMinutes(durationMs: number): number {
  if (durationMs < 0) {
    throw new Error(`Invalid durationMs: ${String(durationMs)}`);
  }
  if (durationMs % MINUTE_MS !== 0) {
    throw new Error(`Duration must be minute-aligned (ms=${String(durationMs)})`);
  }
  return durationMs / MINUTE_MS;
}

function clampMin(value: number): number {
  return value < 0 ? 0 : value;
}

function buildAlert(rule: HosRuleId, severity: Severity, message: string, atEpochMs: number): HosAlert {
  return { rule, severity, message, atEpochMs };
}

function ensureChronological(events: DutyStatusEvent[]): void {
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].tsEpochMs < events[i - 1].tsEpochMs) {
      throw new Error('Duty events must be in chronological order');
    }
  }
}

function buildSegments(events: DutyStatusEvent[], asOfEpochMs: number): Segment[] {
  const segments: Segment[] = [];
  const filtered = events.filter(e => e.tsEpochMs <= asOfEpochMs);

  for (let i = 0; i < filtered.length; i += 1) {
    const start = filtered[i].tsEpochMs;
    const nextTs = i + 1 < filtered.length ? filtered[i + 1].tsEpochMs : asOfEpochMs;
    const end = Math.min(nextTs, asOfEpochMs);

    if (end < start) {
      throw new Error('Duty event timestamps must be non-decreasing');
    }
    if (end === start) {
      continue;
    }

    segments.push({
      startEpochMs: start,
      endEpochMs: end,
      status: filtered[i].status,
    });
  }

  return segments;
}

function computeCycleMinutes(
  segments: Segment[],
  windowStartEpochMs: number,
  asOfEpochMs: number
): number {
  let totalMin = 0;

  for (const seg of segments) {
    if (!isOnDutyStatus(seg.status)) {
      continue;
    }
    const start = Math.max(seg.startEpochMs, windowStartEpochMs);
    const end = Math.min(seg.endEpochMs, asOfEpochMs);
    if (end <= start) {
      continue;
    }
    totalMin += toMinutes(end - start);
  }

  return totalMin;
}

export class HosCalculator {
  /**
   * Calculate HOS status deterministically for a driver.
   *
   * @param config - HOS configuration (ruleset, cycle limits, warning thresholds).
   * @param events - Duty status events (chronological).
   * @param asOfEpochMs - Evaluation time.
   */
  calculate(config: HosConfig, events: DutyStatusEvent[], asOfEpochMs: number): HosStatus {
    if (!Number.isFinite(asOfEpochMs) || asOfEpochMs < 0) {
      throw new Error(`Invalid asOfEpochMs: ${String(asOfEpochMs)}`);
    }
    if (!Number.isInteger(config.warningThresholdMin) || config.warningThresholdMin < 0) {
      throw new Error(`Invalid warningThresholdMin: ${String(config.warningThresholdMin)}`);
    }
    if (!Number.isInteger(config.cycleLimitMin) || config.cycleLimitMin <= 0) {
      throw new Error(`Invalid cycleLimitMin: ${String(config.cycleLimitMin)}`);
    }
    if (!Number.isInteger(config.cycleDays) || config.cycleDays <= 0) {
      throw new Error(`Invalid cycleDays: ${String(config.cycleDays)}`);
    }

    ensureChronological(events);

    if (events.length === 0) {
      return {
        asOfEpochMs,
        remainingDriveMin: DRIVE_LIMIT_MIN,
        remainingDutyWindowMin: DUTY_WINDOW_MIN,
        breakRequiredInMin: BREAK_AFTER_DRIVE_MIN,
        cycleRemainingMin: config.cycleLimitMin,
        alerts: [],
        violations: [],
      };
    }

    const segments = buildSegments(events, asOfEpochMs);

    let restStreakMin = 0;
    let dutyWindowStart: number | undefined;
    let drivingSinceRestMin = 0;
    let drivingSinceBreakMin = 0;
    let lastBreakStartEpochMs: number | undefined;
    let lastRestartEnd: number | undefined;

    for (const seg of segments) {
      const durationMin = toMinutes(seg.endEpochMs - seg.startEpochMs);

      if (isRestStatus(seg.status)) {
        restStreakMin += durationMin;

        if (durationMin >= QUALIFYING_BREAK_MIN) {
          lastBreakStartEpochMs = seg.startEpochMs;
          drivingSinceBreakMin = 0;
        }

        if (restStreakMin >= QUALIFYING_REST_MIN) {
          dutyWindowStart = undefined;
          drivingSinceRestMin = 0;
          drivingSinceBreakMin = 0;
        }

        if (restStreakMin >= RESTART_MIN) {
          lastRestartEnd = seg.endEpochMs;
        }

        continue;
      }

      // Non-rest segment
      if (restStreakMin >= QUALIFYING_REST_MIN) {
        dutyWindowStart = seg.startEpochMs;
        drivingSinceRestMin = 0;
        drivingSinceBreakMin = 0;
        lastBreakStartEpochMs = seg.startEpochMs;
      } else if (!dutyWindowStart) {
        dutyWindowStart = seg.startEpochMs;
        drivingSinceRestMin = 0;
        drivingSinceBreakMin = 0;
      }

      restStreakMin = 0;

      if (seg.status === 'ON_DUTY' && durationMin >= QUALIFYING_BREAK_MIN) {
        lastBreakStartEpochMs = seg.startEpochMs;
        drivingSinceBreakMin = 0;
      }

      if (seg.status === 'DRIVING') {
        drivingSinceRestMin += durationMin;
        drivingSinceBreakMin += durationMin;
      }
    }

    const dutyWindowElapsedMin = dutyWindowStart
      ? toMinutes(asOfEpochMs - dutyWindowStart)
      : 0;

    const remainingDriveMin = clampMin(DRIVE_LIMIT_MIN - drivingSinceRestMin);
    const remainingDutyWindowMin = clampMin(DUTY_WINDOW_MIN - dutyWindowElapsedMin);
    const breakRequiredInMin = clampMin(BREAK_AFTER_DRIVE_MIN - drivingSinceBreakMin);

    const cycleWindowMs = config.cycleDays * 24 * 60 * MINUTE_MS;
    const cycleWindowStart = Math.max(asOfEpochMs - cycleWindowMs, lastRestartEnd ?? 0);
    const cycleUsedMin = computeCycleMinutes(segments, cycleWindowStart, asOfEpochMs);
    const cycleRemainingMin = clampMin(config.cycleLimitMin - cycleUsedMin);

    const alerts: HosAlert[] = [];
    const violations: HosAlert[] = [];

    const warn = (rule: HosRuleId, remainingMin: number, label: string): void => {
      if (remainingMin <= 0) {
        const alert = buildAlert(
          rule,
          'VIOLATION',
          `${label} limit exceeded`,
          asOfEpochMs
        );
        alerts.push(alert);
        violations.push(alert);
        return;
      }
      if (remainingMin <= config.warningThresholdMin) {
        alerts.push(
          buildAlert(rule, 'WARNING', `${label} low (${remainingMin} min left)`, asOfEpochMs)
        );
      }
    };

    warn('DRIVE_11', remainingDriveMin, 'Driving time');
    warn('DUTY_14', remainingDutyWindowMin, 'Duty window');
    warn('BREAK_30', breakRequiredInMin, 'Break');
    warn('CYCLE_70_8', cycleRemainingMin, 'Cycle');

    return {
      asOfEpochMs,
      remainingDriveMin,
      remainingDutyWindowMin,
      breakRequiredInMin,
      cycleRemainingMin,
      lastBreakStartEpochMs,
      alerts,
      violations,
    };
  }
}
