/**
 * HOS Compliance Domain Steps
 *
 * Tags: @integration @hos @eld @compliance
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import type { HosRuleId, HosConfig } from '../../types/hos';
import { VirtualClock } from '../../helpers/VirtualClock';
import { HosCalculator } from '../../helpers/HosCalculator';
import { HosService } from '../../helpers/HosService';
import { EldMockClient } from '../../api/clients/EldMockClient';
import { EldApiClient } from '../../api/clients/EldApiClient';
import type { EldProvider } from '../../api/clients/EldProvider';
import { getHosEnv } from '../../helpers/service-env';

const DEFAULT_WARNING_MIN = 60;
const DEFAULT_CYCLE_LIMIT_MIN = 70 * 60;
const DEFAULT_CYCLE_DAYS = 8;

interface HosContext {
  clock: VirtualClock;
  provider: EldProvider;
  service: HosService;
  config: HosConfig;
}

function requireHosContext(world: CustomWorld): HosContext {
  const clock = world.getTestData<VirtualClock>('hos.clock');
  const provider = world.getTestData<EldProvider>('hos.provider');
  const service = world.getTestData<HosService>('hos.service');
  const config = world.getTestData<HosConfig>('hos.config');

  if (!clock || !provider || !service || !config) {
    throw new Error('HOS context is not initialized. Run the demo setup step first.');
  }

  return { clock, provider, service, config };
}

function parseHosRuleId(value: string): HosRuleId {
  const normalized = value.trim() as HosRuleId;
  const allowed: HosRuleId[] = ['DRIVE_11', 'DUTY_14', 'BREAK_30', 'CYCLE_70_8', 'RESTART_34'];
  if (!allowed.includes(normalized)) {
    throw new Error(`Unsupported HosRuleId: ${value}`);
  }
  return normalized;
}

Given('demo HOS context for driver {string} and vehicle {string}', async function (
  this: CustomWorld,
  driverId: string,
  vehicleId: string
) {
  const env = getHosEnv();

  const clock = new VirtualClock(0);
  const provider: EldProvider = env.eldMode === 'api' ? new EldApiClient() : new EldMockClient(clock);

  const config: HosConfig = {
    warningThresholdMin: DEFAULT_WARNING_MIN,
    timezone: env.timezone,
    ruleset: env.hosRuleset,
    cycleLimitMin: DEFAULT_CYCLE_LIMIT_MIN,
    cycleDays: DEFAULT_CYCLE_DAYS,
  };

  const calculator = new HosCalculator();
  const service = new HosService({
    eldProvider: provider,
    calculator,
    config,
    timeSource: clock,
  });

  await provider.connect(vehicleId);

  this.setTestData('hos.clock', clock);
  this.setTestData('hos.provider', provider);
  this.setTestData('hos.service', service);
  this.setTestData('hos.config', config);
  this.setTestData('hos.driverId', driverId);
  this.setTestData('hos.vehicleId', vehicleId);
});

Given('driver {string} starts OFF_DUTY for {int} minutes', async function (
  this: CustomWorld,
  driverId: string,
  minutes: number
) {
  const { provider } = requireHosContext(this);
  await provider.simulateOffDuty(driverId, minutes);
});

When('driver {string} drives for {int} minutes', async function (
  this: CustomWorld,
  driverId: string,
  minutes: number
) {
  const { provider } = requireHosContext(this);
  await provider.simulateDriving(driverId, minutes);
});

When('driver {string} is ON_DUTY for {int} minutes', async function (
  this: CustomWorld,
  driverId: string,
  minutes: number
) {
  const { clock, provider } = requireHosContext(this);
  await provider.emitDutyStatus({
    tsEpochMs: clock.nowEpochMs(),
    driverId,
    status: 'ON_DUTY',
    source: 'eld',
  });
  clock.advanceMinutes(minutes);
});

Then('HOS status for driver {string} should show WARNING for {string}', async function (
  this: CustomWorld,
  driverId: string,
  ruleText: string
) {
  const { service } = requireHosContext(this);
  const rule = parseHosRuleId(ruleText);
  const status = await service.getHosStatus(driverId);

  const hasWarning = status.alerts.some(a => a.rule === rule && a.severity === 'WARNING');
  expect(hasWarning).toBe(true);
});

Then('HOS status for driver {string} should show VIOLATION for {string}', async function (
  this: CustomWorld,
  driverId: string,
  ruleText: string
) {
  const { service } = requireHosContext(this);
  const rule = parseHosRuleId(ruleText);
  const status = await service.getHosStatus(driverId);

  const hasViolation = status.violations.some(a => a.rule === rule);
  expect(hasViolation).toBe(true);
});

Then('remaining driving minutes for {string} should be {int}', async function (
  this: CustomWorld,
  driverId: string,
  expectedMin: number
) {
  const { service } = requireHosContext(this);
  const status = await service.getHosStatus(driverId);
  expect(status.remainingDriveMin).toBe(expectedMin);
});

Then('DOT inspection data for {string} for {int} days should be generated', async function (
  this: CustomWorld,
  driverId: string,
  days: number
) {
  const { provider } = requireHosContext(this);
  const data = await provider.generateDotInspectionData(driverId, days);
  expect(data.payload.length).toBeGreaterThan(0);
  expect(data.payload).toContain(driverId);
});

Then('no HOS violations should be present for {string}', async function (
  this: CustomWorld,
  driverId: string
) {
  const { service } = requireHosContext(this);
  await service.assertNoViolations(driverId);
});
