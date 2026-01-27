// Main client
export { EkuboClient, createEkuboClient } from "./client.js";

// Core API functions (tree-shakeable)
export {
  fetchSwapQuote,
  fetchSwapQuoteInUsdc,
  type FetchSwapQuoteParams,
} from "./api/quote.js";

export {
  getPriceHistory,
  type PriceDataPoint,
  type PriceHistoryResponse,
  type GetPriceHistoryParams,
} from "./api/price.js";

export {
  fetchTokens,
  fetchToken,
  fetchTokensBatch,
  type ApiTokenInfo,
  type FetchTokensParams,
  type FetchTokenParams,
  type FetchTokensBatchParams,
} from "./api/tokens.js";

export {
  fetchTopPairs,
  fetchTvl,
  fetchVolume,
  fetchPairTvl,
  fetchPairVolume,
  fetchPairPools,
  type PairStats,
  type OverviewStats,
  type PoolInfo,
  type TvlDataPoint,
  type VolumeDataPoint,
  type StatsBaseParams,
  type PairStatsParams,
} from "./api/stats.js";

// Call generation
export {
  generateSwapCalls,
  prepareSwapCalls,
  encodeRoute,
  encodeRouteNode,
  type GenerateSwapCallsParams,
  type EncodedRoute,
} from "./calls/index.js";

// Token utilities
export {
  TokenRegistry,
  getDefaultRegistry,
  createTokenRegistry,
  resolveToken,
  resolveTokenInfo,
  canResolveToken,
  MAINNET_TOKENS,
  getMainnetTokensMap,
} from "./tokens/index.js";

// Chain configuration
export {
  CHAIN_IDS,
  STARKNET_CHAIN_IDS,
  ROUTER_ADDRESSES,
  USDC_ADDRESSES,
  API_URLS,
  CHAIN_CONFIGS,
  STARKNET_TO_EKUBO_CHAIN,
  getEkuboChainId,
  getChainConfig,
  type ChainConfig,
} from "./chains/index.js";

// Polling
export {
  QuotePoller,
  createQuotePoller,
  DEFAULT_POLLING_CONFIG,
  type QuotePollerCallbacks,
  type QuotePollerParams,
} from "./polling/index.js";

// Utilities
export {
  toHex,
  normalizeAddress,
  isAddress,
  splitU256,
  parseTotalCalculated,
  abs,
  addSlippage,
  subtractSlippage,
  calculateBackoff,
  sleep,
  withRetry,
  type RetryOptions,
} from "./utils/index.js";

// Errors
export {
  EkuboError,
  InsufficientLiquidityError,
  ApiError,
  RateLimitError,
  TimeoutError,
  AbortError,
  TokenNotFoundError,
  InvalidChainError,
  isNonRetryableError,
} from "./errors/index.js";

// Types
export type {
  // Quote types
  PoolKey,
  RouteNode,
  SwapSplit,
  SwapQuote,
  SwapQuoteApiResponse,
  SwapQuoteErrorResponse,
  // Token types
  TokenInfo,
  // Config types
  FetchConfig,
  PollingConfig,
  EkuboClientConfig,
  ResolvedConfig,
  // Call types
  SwapCall,
  SwapCallsResult,
  FetchQuoteParams,
} from "./types/index.js";
