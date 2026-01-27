/**
 * Parse total_calculated from API response (handles string or number)
 * Returns absolute value since negative is just API convention for swap direction
 */
export function parseTotalCalculated(totalCalculated: string | number): bigint {
  let value: bigint;
  if (typeof totalCalculated === "string") {
    value = BigInt(totalCalculated);
  } else {
    // For numbers, convert to string first to avoid precision loss
    value = BigInt(Math.floor(totalCalculated));
  }
  // Return absolute value - negative is just Ekubo's convention
  return value < 0n ? -value : value;
}

/**
 * Return absolute value of a bigint
 */
export function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/**
 * Apply slippage to an amount
 * @param amount - Base amount
 * @param slippagePercent - Slippage as percentage (e.g., 5n = 5%)
 * @returns Amount with slippage buffer added
 */
export function addSlippage(amount: bigint, slippagePercent: bigint): bigint {
  return amount + (amount * slippagePercent) / 100n;
}

/**
 * Calculate minimum received after slippage
 * @param amount - Expected amount
 * @param slippagePercent - Slippage as percentage (e.g., 5n = 5%)
 * @returns Minimum acceptable amount
 */
export function subtractSlippage(
  amount: bigint,
  slippagePercent: bigint
): bigint {
  return amount - (amount * slippagePercent) / 100n;
}
