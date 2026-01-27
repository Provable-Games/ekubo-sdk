import type {
  SwapQuote,
  SwapQuoteApiResponse,
  SwapQuoteErrorResponse,
  FetchConfig,
} from "../types/index.js";
import {
  InsufficientLiquidityError,
  ApiError,
  RateLimitError,
  AbortError,
} from "../errors/index.js";
import {
  DEFAULT_FETCH_CONFIG,
  calculateBackoff,
  sleep,
  parseTotalCalculated,
  normalizeAddress,
} from "../utils/index.js";
import { CHAIN_IDS, API_URLS, USDC_ADDRESSES } from "../chains/constants.js";

/**
 * Parameters for fetchSwapQuote
 */
export interface FetchSwapQuoteParams {
  /** Amount to receive (will be negated internally) */
  amount: bigint;
  /** Token to sell (address) */
  tokenFrom: string;
  /** Token to buy (address) */
  tokenTo: string;
  /** Chain ID (Ekubo format) */
  chainId?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Fetch configuration */
  fetchConfig?: FetchConfig;
}

/**
 * Fetch a swap quote from Ekubo API with retry logic
 */
export async function fetchSwapQuote(
  params: FetchSwapQuoteParams
): Promise<SwapQuote> {
  const {
    amount,
    tokenFrom,
    tokenTo,
    chainId = CHAIN_IDS.MAINNET,
    signal,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  // Normalize addresses
  const normalizedTokenFrom = normalizeAddress(tokenFrom);
  const normalizedTokenTo = normalizeAddress(tokenTo);

  // Build URL based on amount sign:
  // - Positive: exact input, selling tokenFrom to get tokenTo → URL: amount/tokenFrom/tokenTo
  // - Negative: exact output, want tokenTo, paying with tokenFrom → URL: amount/tokenTo/tokenFrom
  const isExactOutput = amount < 0n;
  const url = isExactOutput
    ? `${API_URLS.QUOTER}/${chainId}/${amount.toString()}/${normalizedTokenTo}/${normalizedTokenFrom}`
    : `${API_URLS.QUOTER}/${chainId}/${amount.toString()}/${normalizedTokenFrom}/${normalizedTokenTo}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    // Check if aborted before making request
    if (signal?.aborted) {
      throw new AbortError("Request aborted");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      // Combine user signal with timeout signal
      const combinedSignal = signal
        ? anySignal([signal, controller.signal])
        : controller.signal;

      const response = await fetchFn(url, {
        method: "GET",
        signal: combinedSignal,
        mode: "cors",
        credentials: "omit",
      });

      clearTimeout(timeoutId);

      // Success case
      if (response.ok) {
        const data = (await response.json()) as
          | SwapQuoteApiResponse
          | SwapQuoteErrorResponse;

        // Check for error response (e.g., insufficient liquidity)
        if ("error" in data) {
          if (data.error.includes("Insufficient liquidity")) {
            throw new InsufficientLiquidityError(data.error);
          }
          throw new ApiError(data.error);
        }

        return {
          impact: data.price_impact,
          total: parseTotalCalculated(data.total_calculated),
          splits: data.splits,
        };
      }

      // Check 404 responses for insufficient liquidity errors
      if (response.status === 404) {
        try {
          const data = (await response.json()) as SwapQuoteErrorResponse;
          if (data.error?.includes("Insufficient liquidity")) {
            throw new InsufficientLiquidityError(data.error);
          }
        } catch (e) {
          if (e instanceof InsufficientLiquidityError) {
            throw e;
          }
        }
        throw new ApiError(`Failed to fetch swap quote: 404 Not Found`, 404);
      }

      // Rate limited - retry with backoff
      if (response.status === 429) {
        if (attempt === config.maxRetries - 1) {
          throw new RateLimitError("Rate limited (429) - max retries exceeded");
        }

        const retryAfter = response.headers.get("Retry-After");
        const delay = calculateBackoff(
          attempt,
          config.baseBackoff,
          config.maxBackoff,
          retryAfter
        );

        await sleep(delay);
        continue;
      }

      // Other error status codes
      throw new ApiError(
        `Failed to fetch swap quote: ${response.status}`,
        response.status
      );
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error instanceof AbortError)
      ) {
        throw new AbortError("Request aborted");
      }

      // Don't retry on insufficient liquidity
      if (error instanceof InsufficientLiquidityError) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxRetries - 1) {
        break;
      }

      // For network errors, use exponential backoff
      const delay = calculateBackoff(
        attempt,
        config.baseBackoff,
        config.maxBackoff
      );
      await sleep(delay);
    }
  }

  throw lastError || new ApiError("Failed to fetch swap quote: unknown error");
}

/**
 * Fetch token price in USDC
 */
export async function fetchSwapQuoteInUsdc(
  params: Omit<FetchSwapQuoteParams, "tokenTo">
): Promise<bigint> {
  const { chainId = CHAIN_IDS.MAINNET, ...rest } = params;

  const usdcAddress =
    USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES] ??
    USDC_ADDRESSES[CHAIN_IDS.MAINNET];

  const quote = await fetchSwapQuote({
    ...rest,
    tokenTo: usdcAddress,
    chainId,
  });

  return quote.total;
}

/**
 * Helper to combine multiple abort signals
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return controller.signal;
}
