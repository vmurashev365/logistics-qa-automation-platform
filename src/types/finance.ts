/**
 * Finance domain types for compliance checks.
 *
 * Money rules: all money amounts are integer cents.
 */

export interface SalaryCalculationRequest {
  miles: number;
  rate_per_mile_cents: number;
}

export interface SalaryCalculationResponse {
  salary_cents: number;
}

export interface IftaCalculationRequest {
  miles: number;
  mpg: number;
  /** State tax rate in cents per gallon */
  state_rate_cents_per_gallon: number;
  /** Tax already paid in cents */
  tax_paid_cents: number;
}

export interface IftaCalculationResponse {
  gallons: number;
  tax_due_cents: number;
  net_cents: number;
}
