/**
 * Ekubo pool key identifying a unique liquidity pool
 */
export interface PoolKey {
  token0: string;
  token1: string;
  fee: string;
  tick_spacing: number;
  extension: string;
}

/**
 * A single hop in a swap route through one pool
 */
export interface RouteNode {
  pool_key: PoolKey;
  sqrt_ratio_limit: string;
  skip_ahead: number;
}

/**
 * A split in a multi-route swap, representing one path through liquidity pools
 */
export interface SwapSplit {
  amount_specified: string;
  route: RouteNode[];
}

/**
 * A complete swap quote from the Ekubo API
 */
export interface SwapQuote {
  /** Price impact as a decimal (e.g., 0.01 = 1%) */
  impact: number;
  /** Total amount to send or receive (always positive) */
  total: bigint;
  /** Individual route splits for multi-path swaps */
  splits: SwapSplit[];
}

/**
 * Raw API response format (before transformation)
 */
export interface SwapQuoteApiResponse {
  price_impact: number;
  total_calculated: string | number;
  splits: SwapSplit[];
}

/**
 * Error response from the Ekubo API
 */
export interface SwapQuoteErrorResponse {
  error: string;
}
