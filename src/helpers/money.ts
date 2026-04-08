/**
 * Money helpers.
 *
 * Rules:
 * - Represent money as integer cents internally.
 * - Round half-up to 2 decimals when converting from decimal dollars.
 * - Tolerance for comparisons is typically ±1 cent.
 */

/** Round half-up (away from zero) to a fixed number of decimals. */
export function roundHalfUp(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid number for rounding: ${String(value)}`);
  }
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const sign = Math.sign(scaled) || 1;
  const rounded = Math.floor(Math.abs(scaled) + 0.5);
  return (sign * rounded) / factor;
}

/** Convert a decimal-dollar amount to integer cents using half-up rounding. */
export function dollarsToCents(amountDollars: number): number {
  const rounded = roundHalfUp(amountDollars, 2);
  const cents = rounded * 100;
  // cents should be an integer after rounding; guard against floating drift.
  return Math.trunc(Math.round(cents));
}

/** Alias for callers that treat the input as a decimal-dollar amount. */
export function toCents(amount: number): number {
  return dollarsToCents(amount);
}

function toPlainDecimalString(value: number): string {
  const s = value.toString();
  if (!/[eE]/.test(s)) return s;
  // Avoid scientific notation so we can parse deterministically.
  // 12 decimals is sufficient for gallons-style quantities used in tests.
  const fixed = value.toFixed(12);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function parseDecimalToBigInt(value: number): { numerator: bigint; scale: number } {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid decimal value: ${String(value)}`);
  }

  const raw = toPlainDecimalString(value).trim();
  const match = raw.match(/^([+-])?(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`Unsupported decimal format: ${raw}`);
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const intPart = match[2];
  const fracPart = match[3] ?? '';
  const scale = fracPart.length;
  const digits = (intPart + fracPart).replace(/^0+(?=\d)/, '');
  const numerator = digits.length === 0 ? 0n : BigInt(digits);
  return { numerator: sign * numerator, scale };
}

function pow10(n: number): bigint {
  let v = 1n;
  for (let i = 0; i < n; i += 1) v *= 10n;
  return v;
}

function assertSafeIntegerCents(cents: bigint): number {
  const abs = cents < 0n ? -cents : cents;
  if (abs > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Cents value exceeds JS safe integer range: ${cents.toString()}`);
  }
  return Number(cents);
}

/**
 * Multiply a fractional quantity by an integer unit price in cents.
 *
 * Example: 10.5 gallons × 420 cents/gal = 4410 cents.
 * Rounds half-up to the nearest cent.
 */
export function mulToCents(quantity: number, unitPriceCents: number): number {
  if (!Number.isFinite(quantity)) {
    throw new Error(`Invalid quantity: ${String(quantity)}`);
  }
  if (!Number.isInteger(unitPriceCents)) {
    throw new Error(`unitPriceCents must be an integer (got ${String(unitPriceCents)})`);
  }

  const { numerator, scale } = parseDecimalToBigInt(quantity);
  const denom = pow10(scale);
  const totalNumer = numerator * BigInt(unitPriceCents);

  const sign = totalNumer < 0n ? -1n : 1n;
  const absNumer = totalNumer < 0n ? -totalNumer : totalNumer;
  const quotient = absNumer / denom;
  const remainder = absNumer % denom;
  const rounded = remainder * 2n >= denom ? quotient + 1n : quotient;

  return assertSafeIntegerCents(sign * rounded);
}

/** Round a "cents" float to an integer cent using half-up rounding. */
export function roundToCentsInt(valueInCents: number): number {
  if (!Number.isFinite(valueInCents)) {
    throw new Error(`Invalid cents value: ${String(valueInCents)}`);
  }
  const sign = Math.sign(valueInCents) || 1;
  return sign * Math.floor(Math.abs(valueInCents) + 0.5);
}

export function centsDelta(aCents: number, bCents: number): number {
  return Math.abs(aCents - bCents);
}

export function isWithinCentsTolerance(actualCents: number, expectedCents: number, toleranceCents: number = 1): boolean {
  return centsDelta(actualCents, expectedCents) <= toleranceCents;
}
