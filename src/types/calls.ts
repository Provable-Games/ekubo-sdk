/**
 * A single Starknet call (compatible with starknet.js Call type)
 */
export interface SwapCall {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
}

/**
 * Result of swap call generation
 */
export interface SwapCallsResult {
  /** Transfer call to send tokens to router */
  transferCall: SwapCall;
  /** Swap execution calls */
  swapCalls: SwapCall[];
  /** Clear remaining tokens call */
  clearCall: SwapCall;
  /** All calls in execution order */
  allCalls: SwapCall[];
}

/**
 * Parameters for generating swap calls
 */
export interface GenerateSwapCallsParams {
  /** Token being sold (address or symbol) */
  sellToken: string;
  /** Token being bought (address or symbol) */
  buyToken: string;
  /** Minimum amount of buyToken to receive */
  minimumReceived: bigint;
  /** Quote from Ekubo API */
  quote: import("./quote.js").SwapQuote;
  /** Slippage percentage as bigint (default: 5n = 5%) */
  slippagePercent?: bigint;
}

/**
 * Parameters for fetching a swap quote
 */
export interface FetchQuoteParams {
  /** Amount to swap (in smallest unit) */
  amount: bigint;
  /** Token to sell (address or symbol) */
  tokenFrom: string;
  /** Token to buy (address or symbol) */
  tokenTo: string;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
}
