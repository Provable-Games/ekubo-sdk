/**
 * Token information for registry and resolution
 */
export interface TokenInfo {
  /** Token symbol (e.g., "ETH", "STRK") */
  symbol: string;
  /** Contract address (hex string) */
  address: string;
  /** Token decimals (default: 18) */
  decimals?: number;
  /** Human-readable name */
  name?: string;
}
