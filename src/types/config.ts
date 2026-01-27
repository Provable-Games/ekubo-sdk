import type { TokenInfo } from "./token.js";

/**
 * Configuration for fetch operations with retry logic
 */
export interface FetchConfig {
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base backoff delay in milliseconds (default: 1000) */
  baseBackoff?: number;
  /** Maximum backoff delay in milliseconds (default: 5000) */
  maxBackoff?: number;
  /** Custom fetch function (for SSR or custom implementations) */
  fetch?: typeof globalThis.fetch;
}

/**
 * Configuration for quote polling
 */
export interface PollingConfig {
  /** Polling interval in milliseconds (default: 5000) */
  interval?: number;
  /** Maximum consecutive errors before auto-stopping (default: 3) */
  maxConsecutiveErrors?: number;
}

/**
 * Main configuration for EkuboClient
 */
export interface EkuboClientConfig {
  /** Chain shorthand: 'mainnet' or 'sepolia' */
  chain?: "mainnet" | "sepolia";
  /** Custom chain ID (overrides chain setting) */
  chainId?: string;
  /** Custom quoter API URL (for swap quotes) */
  quoterApiUrl?: string;
  /** Custom API URL (for tokens, prices, stats, etc.) */
  apiUrl?: string;
  /** Custom router contract address */
  routerAddress?: string;
  /** Default slippage percentage as bigint (default: 5n = 5%) */
  defaultSlippagePercent?: bigint;
  /** Fetch configuration */
  fetch?: FetchConfig;
  /** Polling configuration */
  polling?: PollingConfig;
  /** Additional custom tokens to register */
  customTokens?: TokenInfo[];
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedConfig {
  chainId: string;
  quoterApiUrl: string;
  apiUrl: string;
  routerAddress: string;
  defaultSlippagePercent: bigint;
  fetch: Required<FetchConfig>;
  polling: Required<PollingConfig>;
}
