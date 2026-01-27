import type {
  EkuboClientConfig,
  ResolvedConfig,
  SwapQuote,
  SwapCallsResult,
  SwapCall,
  FetchQuoteParams,
  TokenInfo,
  PollingConfig,
} from "./types/index.js";
import { fetchSwapQuote, fetchSwapQuoteInUsdc } from "./api/quote.js";
import { getPriceHistory, type PriceHistoryResponse } from "./api/price.js";
import {
  fetchTokens,
  fetchToken,
  fetchTokensBatch,
  type ApiTokenInfo,
} from "./api/tokens.js";
import {
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
} from "./api/stats.js";
import {
  generateSwapCalls,
  prepareSwapCalls,
  type GenerateSwapCallsParams,
} from "./calls/generator.js";
import { TokenRegistry, resolveToken } from "./tokens/index.js";
import {
  QuotePoller,
  type QuotePollerCallbacks,
  DEFAULT_POLLING_CONFIG,
} from "./polling/poller.js";
import { getChainConfig, CHAIN_IDS } from "./chains/constants.js";
import { DEFAULT_FETCH_CONFIG } from "./utils/retry.js";
import { InvalidChainError } from "./errors/index.js";

/**
 * Default client configuration
 */
const DEFAULT_CONFIG = {
  chain: "mainnet" as const,
  defaultSlippagePercent: 5n,
};

/**
 * Main Ekubo SDK client
 *
 * Provides a high-level interface for:
 * - Fetching swap quotes
 * - Generating swap calls
 * - Token symbol resolution
 * - Quote polling
 * - Protocol statistics (TVL, volume, pairs)
 * - Dynamic token list fetching
 */
export class EkuboClient {
  private readonly config: ResolvedConfig;
  private readonly tokenRegistry: TokenRegistry;

  constructor(config: EkuboClientConfig = {}) {
    this.config = this.resolveConfig(config);
    this.tokenRegistry = new TokenRegistry(config.customTokens);
  }

  /**
   * Resolve configuration with defaults
   */
  private resolveConfig(config: EkuboClientConfig): ResolvedConfig {
    const chain = config.chain ?? DEFAULT_CONFIG.chain;
    const chainConfig = config.chainId
      ? getChainConfig(config.chainId)
      : getChainConfig(chain);

    if (!chainConfig && !config.chainId) {
      throw new InvalidChainError(chain);
    }

    return {
      chainId: config.chainId ?? chainConfig?.chainId ?? CHAIN_IDS.MAINNET,
      quoterApiUrl:
        config.quoterApiUrl ??
        chainConfig?.quoterApiUrl ??
        "https://prod-api-quoter.ekubo.org",
      apiUrl:
        config.apiUrl ?? chainConfig?.apiUrl ?? "https://prod-api.ekubo.org",
      routerAddress: config.routerAddress ?? chainConfig?.routerAddress ?? "",
      defaultSlippagePercent:
        config.defaultSlippagePercent ?? DEFAULT_CONFIG.defaultSlippagePercent,
      fetch: { ...DEFAULT_FETCH_CONFIG, ...config.fetch },
      polling: { ...DEFAULT_POLLING_CONFIG, ...config.polling },
    };
  }

  /**
   * Get the current chain ID
   */
  get chainId(): string {
    return this.config.chainId;
  }

  /**
   * Get the router contract address
   */
  get routerAddress(): string {
    return this.config.routerAddress;
  }

  /**
   * Get the token registry
   */
  get tokens(): TokenRegistry {
    return this.tokenRegistry;
  }

  /**
   * Resolve a token identifier (symbol or address) to an address
   */
  resolveToken(tokenIdentifier: string): string {
    return resolveToken(tokenIdentifier, this.tokenRegistry);
  }

  // ==========================================================================
  // Swap Quotes
  // ==========================================================================

  /**
   * Fetch a swap quote
   *
   * @param params - Quote parameters (supports symbols or addresses)
   * @returns Swap quote
   */
  async getQuote(params: FetchQuoteParams): Promise<SwapQuote> {
    const tokenFrom = this.resolveToken(params.tokenFrom);
    const tokenTo = this.resolveToken(params.tokenTo);

    return fetchSwapQuote({
      amount: params.amount,
      tokenFrom,
      tokenTo,
      chainId: this.config.chainId,
      signal: params.signal,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch a token price in USDC
   *
   * @param tokenIdentifier - Token symbol or address
   * @param amount - Amount of token
   * @param signal - Optional abort signal
   * @returns Price in USDC (as bigint)
   */
  async getUsdcPrice(
    tokenIdentifier: string,
    amount: bigint,
    signal?: AbortSignal
  ): Promise<bigint> {
    const tokenFrom = this.resolveToken(tokenIdentifier);

    return fetchSwapQuoteInUsdc({
      amount,
      tokenFrom,
      chainId: this.config.chainId,
      signal,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch price history
   *
   * @param token - Token symbol or address
   * @param otherToken - Quote token symbol or address
   * @param interval - Time interval in seconds (default: 7000)
   * @returns Price history data
   */
  async getPriceHistory(
    token: string,
    otherToken: string,
    interval?: number
  ): Promise<PriceHistoryResponse> {
    const resolvedToken = this.resolveToken(token);
    const resolvedOtherToken = this.resolveToken(otherToken);

    return getPriceHistory({
      token: resolvedToken,
      otherToken: resolvedOtherToken,
      chainId: this.config.chainId,
      interval,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  // ==========================================================================
  // Swap Call Generation
  // ==========================================================================

  /**
   * Generate swap calls from a quote
   *
   * @param params - Call generation parameters (supports symbols or addresses)
   * @returns Swap calls result
   */
  generateSwapCalls(
    params: Omit<GenerateSwapCallsParams, "chainId" | "routerAddress">
  ): SwapCallsResult {
    const sellToken = this.resolveToken(params.sellToken);
    const buyToken = this.resolveToken(params.buyToken);

    return generateSwapCalls({
      ...params,
      sellToken,
      buyToken,
      chainId: this.config.chainId,
      routerAddress: this.config.routerAddress,
      slippagePercent:
        params.slippagePercent ?? this.config.defaultSlippagePercent,
    });
  }

  /**
   * Prepare swap calls with approval included
   *
   * @param params - Call generation parameters (supports symbols or addresses)
   * @returns Swap calls result with approve call
   */
  prepareSwapCalls(
    params: Omit<GenerateSwapCallsParams, "chainId" | "routerAddress">
  ): SwapCallsResult & { approveCall: SwapCall } {
    const sellToken = this.resolveToken(params.sellToken);
    const buyToken = this.resolveToken(params.buyToken);

    return prepareSwapCalls({
      ...params,
      sellToken,
      buyToken,
      chainId: this.config.chainId,
      routerAddress: this.config.routerAddress,
      slippagePercent:
        params.slippagePercent ?? this.config.defaultSlippagePercent,
    });
  }

  // ==========================================================================
  // Quote Polling
  // ==========================================================================

  /**
   * Create a quote poller for real-time updates
   *
   * @param params - Quote parameters (supports symbols or addresses)
   * @param callbacks - Poller callbacks
   * @param config - Optional polling configuration
   * @returns QuotePoller instance
   */
  createQuotePoller(
    params: Omit<FetchQuoteParams, "signal">,
    callbacks: QuotePollerCallbacks,
    config?: PollingConfig
  ): QuotePoller {
    const tokenFrom = this.resolveToken(params.tokenFrom);
    const tokenTo = this.resolveToken(params.tokenTo);

    return new QuotePoller(
      {
        amount: params.amount,
        tokenFrom,
        tokenTo,
        chainId: this.config.chainId,
      },
      callbacks,
      { ...this.config.polling, ...config },
      this.config.fetch
    );
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  /**
   * Register a custom token in the local registry
   */
  registerToken(token: TokenInfo): void {
    this.tokenRegistry.register(token);
  }

  /**
   * Fetch all tokens from the Ekubo API
   *
   * @returns Array of token metadata from the API
   */
  async fetchTokens(): Promise<ApiTokenInfo[]> {
    return fetchTokens({
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch metadata for a single token from the API
   *
   * @param tokenAddress - Token contract address
   * @returns Token metadata or null if not found
   */
  async fetchToken(tokenAddress: string): Promise<ApiTokenInfo | null> {
    const resolved = this.resolveToken(tokenAddress);
    return fetchToken({
      tokenAddress: resolved,
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch metadata for multiple tokens at once
   *
   * @param tokenAddresses - Array of token addresses
   * @returns Array of token metadata
   */
  async fetchTokensBatch(tokenAddresses: string[]): Promise<ApiTokenInfo[]> {
    const resolved = tokenAddresses.map((addr) => this.resolveToken(addr));
    return fetchTokensBatch({
      tokenAddresses: resolved,
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch tokens from API and register them in the local registry
   *
   * @returns Number of tokens registered
   */
  async syncTokensFromApi(): Promise<number> {
    const apiTokens = await this.fetchTokens();

    for (const token of apiTokens) {
      this.tokenRegistry.register({
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        name: token.name,
      });
    }

    return apiTokens.length;
  }

  // ==========================================================================
  // Protocol Statistics
  // ==========================================================================

  /**
   * Fetch top trading pairs by volume
   *
   * @returns Array of pair statistics
   */
  async getTopPairs(): Promise<PairStats[]> {
    return fetchTopPairs({
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch protocol TVL overview
   *
   * @returns TVL statistics
   */
  async getTvl(): Promise<OverviewStats> {
    return fetchTvl({
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch protocol volume overview
   *
   * @returns Volume statistics
   */
  async getVolume(): Promise<OverviewStats> {
    return fetchVolume({
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch TVL history for a trading pair
   *
   * @param tokenA - First token (symbol or address)
   * @param tokenB - Second token (symbol or address)
   * @returns TVL data points
   */
  async getPairTvl(tokenA: string, tokenB: string): Promise<TvlDataPoint[]> {
    const resolvedA = this.resolveToken(tokenA);
    const resolvedB = this.resolveToken(tokenB);

    return fetchPairTvl({
      tokenA: resolvedA,
      tokenB: resolvedB,
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch volume history for a trading pair
   *
   * @param tokenA - First token (symbol or address)
   * @param tokenB - Second token (symbol or address)
   * @returns Volume data points
   */
  async getPairVolume(
    tokenA: string,
    tokenB: string
  ): Promise<VolumeDataPoint[]> {
    const resolvedA = this.resolveToken(tokenA);
    const resolvedB = this.resolveToken(tokenB);

    return fetchPairVolume({
      tokenA: resolvedA,
      tokenB: resolvedB,
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }

  /**
   * Fetch pools for a trading pair
   *
   * @param tokenA - First token (symbol or address)
   * @param tokenB - Second token (symbol or address)
   * @returns Pool information
   */
  async getPairPools(tokenA: string, tokenB: string): Promise<PoolInfo[]> {
    const resolvedA = this.resolveToken(tokenA);
    const resolvedB = this.resolveToken(tokenB);

    return fetchPairPools({
      tokenA: resolvedA,
      tokenB: resolvedB,
      chainId: this.config.chainId,
      apiUrl: this.config.apiUrl,
      fetchConfig: this.config.fetch,
    });
  }
}

/**
 * Create an EkuboClient instance
 */
export function createEkuboClient(config?: EkuboClientConfig): EkuboClient {
  return new EkuboClient(config);
}
