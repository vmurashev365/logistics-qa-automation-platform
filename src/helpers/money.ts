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
  if (!Number.isFinite(amountDollars)) {
    throw new Error(`Invalid number for rounding: ${String(amountDollars)}`);
  }
  const { numerator, scale } = parseDecimalToBigInt(amountDollars);
  return Number(divideHalfUp(numerator * 100n, pow10(scale)));
}

/** Alias for callers that treat the input as a decimal-dollar amount. */
export function toCents(amount: number): number {
  return dollarsToCents(amount);
}

function parseDecimalToBigInt(value: number): { numerator: bigint; scale: number } {
  // Parse the number's shortest decimal representation, including scientific notation.
  const raw = value.toString();
  const match = raw.match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/);
  if (!match) {
    throw new Error(`Unsupported decimal format: ${raw}`);
  }

  const [, sign, whole, fraction = '', exponent = '0'] = match;
  const numerator = BigInt(sign + whole + fraction);
  const scale = fraction.length - Number(exponent);
  return scale < 0 ? { numerator: numerator * pow10(-scale), scale: 0 } : { numerator, scale };
}

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  const magnitude = numerator < 0n ? -numerator : numerator;
  const quotient = magnitude / denominator;
  const remainder = magnitude % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return numerator < 0n ? -rounded : rounded;
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
  return assertSafeIntegerCents(divideHalfUp(numerator * BigInt(unitPriceCents), pow10(scale)));
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
