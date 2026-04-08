/**
 * Hours of Service (HOS) and ELD domain types.
 *
 * All time values are expressed in integer minutes unless otherwise stated.
 */

export type DutyStatus = 'OFF_DUTY' | 'ON_DUTY' | 'DRIVING' | 'SLEEPER';

export type EldEventType =
  | 'DUTY_CHANGE'
  | 'MOTION_START'
  | 'MOTION_STOP'
  | 'GPS'
  | 'MALFUNCTION'
  | 'DIAGNOSTIC';

export type Severity = 'INFO' | 'WARNING' | 'VIOLATION';

export type HosRuleId = 'DRIVE_11' | 'DUTY_14' | 'BREAK_30' | 'CYCLE_70_8' | 'RESTART_34';

export interface GpsPoint {
  lat: number;
  lon: number;
  accuracyM?: number;
}

export interface DutyStatusEvent {
  tsEpochMs: number;
  driverId: string;
  status: DutyStatus;
  source: 'eld' | 'manual';
  location?: GpsPoint;
  odometerMiles?: number;
  engineHours?: number;
}

export interface HosAlert {
  rule: HosRuleId;
  severity: Severity;
  message: string;
  atEpochMs: number;
}

export interface HosStatus {
  asOfEpochMs: number;
  remainingDriveMin: number;
  remainingDutyWindowMin: number;
  breakRequiredInMin: number;
  cycleRemainingMin: number;
  lastBreakStartEpochMs?: number;
  alerts: HosAlert[];
  violations: HosAlert[];
}

export interface HosConfig {
  warningThresholdMin: number;
  timezone: string;
  ruleset: 'FMCSA';
  cycleLimitMin: number;
  cycleDays: number;
}
