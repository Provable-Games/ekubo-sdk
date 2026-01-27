/**
 * Convert a value to hex string (without leading zeros normalization)
 */
export function toHex(value: bigint | number | string): string {
  if (typeof value === "string") {
    // If already a hex string, normalize it
    if (value.startsWith("0x") || value.startsWith("0X")) {
      return "0x" + BigInt(value).toString(16);
    }
    // Otherwise treat as decimal
    return "0x" + BigInt(value).toString(16);
  }
  return "0x" + BigInt(value).toString(16);
}

/**
 * Normalize an address to lowercase hex format
 */
export function normalizeAddress(address: string): string {
  // Remove 0x prefix, convert to bigint to remove leading zeros, then back to hex
  const normalized = toHex(address);
  return normalized.toLowerCase();
}

/**
 * Check if a string looks like an address (hex format)
 */
export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(value);
}

/**
 * Split a u256 value into low and high parts for calldata
 */
export function splitU256(value: bigint): { low: string; high: string } {
  const low = value % 2n ** 128n;
  const high = value >> 128n;
  return {
    low: toHex(low),
    high: toHex(high),
  };
}
