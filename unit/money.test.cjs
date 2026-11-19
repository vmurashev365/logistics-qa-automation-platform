const assert = require('node:assert/strict');
const { test } = require('node:test');
const { dollarsToCents, mulToCents, toCents } = require('../src/helpers/money');

// Expected cents come from the written dollar values, rounding a half cent away from zero.
for (const [amount, expected] of [
  [1.005, 101],
  [10.075, 1008],
  [-1.005, -101],
  [-10.075, -1008],
  [0.005, 1],
  [-0.005, -1],
  [1.004999, 100],
  [1.005001, 101],
  [-1.004999, -100],
  [-1.005001, -101],
  [0.004999999999999, 0],
  [0, 0],
  [1e-13, 0],
  [1e21, 1e23],
  [4.20, 420],
  [210, 21000],
  [1234.56, 123456],
  [-42.12, -4212],
]) {
  test(`dollarsToCents(${amount}) returns ${expected}`, () => {
    assert.equal(dollarsToCents(amount), expected);
  });
}

test('toCents uses the same half-cent rule', () => {
  assert.equal(toCents(-2.675), -268);
});

test('non-finite dollars retain the original error', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => dollarsToCents(value), { message: `Invalid number for rounding: ${value}` });
  }
});

test('fractional gallons still round to cents once after multiplication', () => {
  assert.equal(mulToCents(10.5, 420), 4410);
  assert.equal(mulToCents(1.005, 100), 101);
  assert.equal(mulToCents(-1.005, 100), -101);
});
