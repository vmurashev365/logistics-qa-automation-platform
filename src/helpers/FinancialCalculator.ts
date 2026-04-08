/**
 * FinancialCalculator
 *
 * Pure calculations for financial compliance checks.
 *
 * Money rules:
 * - Input rates/taxes are in integer cents.
 * - Outputs are integer cents.
 * - Rounding uses half-up to nearest cent when intermediate results are fractional.
 */

import { roundToCentsInt } from './money';

export interface SalaryInputs {
  miles: number;
  ratePerMileCents: number;
}

export interface IftaInputs {
  miles: number;
  mpg: number;
  stateRateCentsPerGallon: number;
  taxPaidCents: number;
}

export interface IftaResult {
  gallons: number;
  taxDueCents: number;
  netCents: number;
}

export class FinancialCalculator {
  /** salary_cents = miles × rate_per_mile_cents */
  salaryCents(inputs: SalaryInputs): number {
    const { miles, ratePerMileCents } = inputs;

    if (!Number.isFinite(miles) || miles < 0) {
      throw new Error(`Invalid miles: ${String(miles)}`);
    }
    if (!Number.isInteger(ratePerMileCents) || ratePerMileCents < 0) {
      throw new Error(`Invalid ratePerMileCents (must be integer cents): ${String(ratePerMileCents)}`);
    }

    const rawCents = miles * ratePerMileCents;
    return roundToCentsInt(rawCents);
  }

  /**
   * IFTA rules:
   * - gallons = miles / mpg
   * - tax_due_cents = gallons × state_rate_cents_per_gallon
   * - net_cents = tax_due_cents - tax_paid_cents
   */
  ifta(inputs: IftaInputs): IftaResult {
    const { miles, mpg, stateRateCentsPerGallon, taxPaidCents } = inputs;

    if (!Number.isFinite(miles) || miles < 0) {
      throw new Error(`Invalid miles: ${String(miles)}`);
    }
    if (!Number.isFinite(mpg) || mpg <= 0) {
      throw new Error(`Invalid mpg: ${String(mpg)}`);
    }
    if (!Number.isInteger(stateRateCentsPerGallon) || stateRateCentsPerGallon < 0) {
      throw new Error(`Invalid stateRateCentsPerGallon (must be integer cents): ${String(stateRateCentsPerGallon)}`);
    }
    if (!Number.isInteger(taxPaidCents)) {
      throw new Error(`Invalid taxPaidCents (must be integer cents): ${String(taxPaidCents)}`);
    }

    const gallons = miles / mpg;
    const taxDueCents = roundToCentsInt(gallons * stateRateCentsPerGallon);
    const netCents = taxDueCents - taxPaidCents;

    return {
      gallons,
      taxDueCents,
      netCents,
    };
  }
}
