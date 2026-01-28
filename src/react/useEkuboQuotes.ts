import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { SwapQuote, EkuboClientConfig } from "../types/index.js";
import { EkuboClient, createEkuboClient } from "../client.js";
import { InsufficientLiquidityError } from "../errors/index.js";
import { useOptionalEkuboClient } from "./context.js";

export interface QuoteResult {
  /** The swap quote */
  quote: SwapQuote | null;
  /** Whether this quote is loading */
  loading: boolean;
  /** Error from fetching this quote */
  error: Error | null;
  /** Whether there's insufficient liquidity */
  insufficientLiquidity: boolean;
}

export interface QuotesMap {
  [sellToken: string]: QuoteResult;
}

export interface UseEkuboQuotesResult {
  /** Map of sellToken address to quote result */
  quotes: QuotesMap;
  /** Whether any quotes are still loading */
  isLoading: boolean;
  /** Get quote for a specific sell token */
  getQuote: (sellToken: string) => QuoteResult | undefined;
  /** Manually refetch all quotes */
  refetch: () => void;
}

export interface UseEkuboQuotesProps {
  /** Array of tokens that can be sold (addresses or symbols) */
  sellTokens: string[];
  /** Token being bought (address or symbol) */
  buyToken: string | null;
  /** Amount to swap (positive for exact input, negative for exact output) */
  amount: bigint;
  /** Whether to enable quote fetching (default: true) */
  enabled?: boolean;
  /** Whether to continuously poll for quote updates (default: false) */
  poll?: boolean;
  /** Polling interval in ms when poll is true (default: 30000 - 30 seconds) */
  pollingInterval?: number;
  /** Client config (optional if using EkuboProvider) */
  config?: EkuboClientConfig;
}

// Module-level singleton for when not using provider
let defaultClientInstance: EkuboClient | null = null;

function getDefaultClient(config?: EkuboClientConfig): EkuboClient {
  if (!defaultClientInstance) {
    defaultClientInstance = createEkuboClient(config);
  }
  return defaultClientInstance;
}

/**
 * Hook for fetching swap quotes for multiple sell tokens at once.
 *
 * Useful when you want to show users multiple payment options with
 * their costs upfront, allowing instant switching between options.
 *
 * @example
 * ```tsx
 * import { useEkuboQuotes } from '@provable-games/ekubo-sdk/react';
 *
 * function PaymentSelector() {
 *   const { quotes, isLoading, getQuote } = useEkuboQuotes({
 *     sellTokens: [ETH_ADDRESS, STRK_ADDRESS, USDC_ADDRESS],
 *     buyToken: ENTRY_TOKEN,
 *     amount: entryFeeAmount,
 *   });
 *
 *   return (
 *     <div>
 *       {sellTokens.map(token => {
 *         const result = getQuote(token);
 *         return (
 *           <button key={token} onClick={() => setSelectedToken(token)}>
 *             Pay with {token}: {result?.quote?.total ?? 'Loading...'}
 *           </button>
 *         );
 *       })}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEkuboQuotes({
  sellTokens,
  buyToken,
  amount,
  enabled = true,
  poll = false,
  pollingInterval = 30000,
  config,
}: UseEkuboQuotesProps): UseEkuboQuotesResult {
  const contextClient = useOptionalEkuboClient();
  const client = contextClient ?? getDefaultClient(config);

  const [quotes, setQuotes] = useState<QuotesMap>({});
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Stable key for sellTokens - used to detect actual changes in token list
  const sellTokensKey = useMemo(
    () => JSON.stringify([...sellTokens].sort()),
    [sellTokens]
  );

  const canFetch = useMemo(() => {
    return (
      buyToken !== null &&
      amount !== 0n &&
      sellTokens.length > 0
    );
  }, [buyToken, amount, sellTokens.length]);

  const shouldFetch = enabled && canFetch;

  // The actual fetch implementation - depends on current values
  const fetchAllQuotesImpl = useCallback(async () => {
    if (!canFetch || !buyToken) return;

    // Cancel any pending requests
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();

    // Initialize loading state for all tokens
    setQuotes((prev) => {
      const updated = { ...prev };
      for (const sellToken of sellTokens) {
        if (sellToken.toLowerCase() === buyToken.toLowerCase()) continue;
        updated[sellToken] = {
          quote: prev[sellToken]?.quote ?? null,
          loading: true,
          error: null,
          insufficientLiquidity: false,
        };
      }
      return updated;
    });

    // Fetch quotes in parallel
    // Use negative amount for exact output - we want to receive `amount` of buyToken
    // and need to know how much of each sellToken to send
    const exactOutputAmount = amount > 0n ? -amount : amount;

    const fetchPromises = sellTokens
      .filter((sellToken) => sellToken.toLowerCase() !== buyToken.toLowerCase())
      .map(async (sellToken) => {
        const abortController = new AbortController();
        abortControllersRef.current.set(sellToken, abortController);

        try {
          const quote = await client.getQuote({
            amount: exactOutputAmount,
            tokenFrom: sellToken,
            tokenTo: buyToken,
            signal: abortController.signal,
          });

          return {
            sellToken,
            result: {
              quote,
              loading: false,
              error: null,
              insufficientLiquidity: false,
            } as QuoteResult,
          };
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            return null;
          }

          const isInsufficient = err instanceof InsufficientLiquidityError;

          return {
            sellToken,
            result: {
              quote: null,
              loading: false,
              error: err instanceof Error ? err : new Error("Unknown error"),
              insufficientLiquidity: isInsufficient,
            } as QuoteResult,
          };
        }
      });

    const results = await Promise.all(fetchPromises);

    // Update state with all results
    setQuotes((prev) => {
      const updated = { ...prev };
      for (const result of results) {
        if (result) {
          updated[result.sellToken] = result.result;
        }
      }
      return updated;
    });
  }, [canFetch, buyToken, sellTokens, amount, client]);

  // Keep ref updated with latest implementation (synchronous update)
  const fetchAllQuotesRef = useRef(fetchAllQuotesImpl);
  fetchAllQuotesRef.current = fetchAllQuotesImpl;

  // Stable wrapper that always calls the latest implementation
  // This breaks the circular dependency between the callback and the effect
  const fetchAllQuotes = useCallback(async () => {
    return fetchAllQuotesRef.current();
  }, []);

  // Fetch quotes and optionally set up polling
  useEffect(() => {
    console.log('[useEkuboQuotes] Effect running', {
      shouldFetch,
      poll,
      pollingInterval,
      sellTokensKey,
      buyToken: buyToken?.slice(0, 10),
      amount: amount?.toString(),
      timestamp: new Date().toISOString(),
    });

    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (!shouldFetch) {
      return;
    }

    // Fetch immediately
    console.log('[useEkuboQuotes] Fetching quotes...');
    fetchAllQuotes();

    // Set up polling interval if poll is enabled
    if (poll) {
      console.log('[useEkuboQuotes] Setting up polling interval:', pollingInterval);
      pollerRef.current = setInterval(fetchAllQuotes, pollingInterval);
    }

    return () => {
      console.log('[useEkuboQuotes] Cleanup running');
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    };
  }, [shouldFetch, poll, fetchAllQuotes, pollingInterval, sellTokensKey, buyToken, amount]);

  const isLoading = useMemo(() => {
    return Object.values(quotes).some((q) => q.loading);
  }, [quotes]);

  const getQuote = useCallback(
    (sellToken: string): QuoteResult | undefined => {
      return quotes[sellToken];
    },
    [quotes]
  );

  const refetch = useCallback(() => {
    fetchAllQuotes();
  }, [fetchAllQuotes]);

  return useMemo(
    () => ({
      quotes,
      isLoading,
      getQuote,
      refetch,
    }),
    [quotes, isLoading, getQuote, refetch]
  );
}
