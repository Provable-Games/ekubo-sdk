import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { SwapQuote, SwapCallsResult, EkuboClientConfig } from "../types/index.js";
import { EkuboClient, createEkuboClient } from "../client.js";
import { InsufficientLiquidityError } from "../errors/index.js";
import { normalizeAddress } from "../utils/index.js";
import { useOptionalEkuboClient } from "./context.js";

export interface UseEkuboSwapState {
  /** Current swap quote */
  quote: SwapQuote | null;
  /** Whether a quote is being fetched */
  loading: boolean;
  /** Error from the last quote fetch */
  error: Error | null;
  /** Price impact percentage */
  priceImpact: number | null;
  /** Whether there's insufficient liquidity for this swap */
  insufficientLiquidity: boolean;
}

export interface UseEkuboSwapResult {
  /** Current state */
  state: UseEkuboSwapState;
  /** Generate swap calls from the current quote */
  generateCalls: (slippagePercent?: bigint, minimumReceived?: bigint) => SwapCallsResult | null;
  /** Manually trigger a quote refetch */
  refetch: () => void;
}

export interface UseEkuboSwapProps {
  /** Token being sold (address or symbol) */
  sellToken: string | null;
  /** Token being bought (address or symbol) */
  buyToken: string | null;
  /** Amount to swap (positive for exact input, negative for exact output) */
  amount: bigint;
  /** Whether to enable quote polling (default: true when tokens are valid) */
  enabled?: boolean;
  /** Polling interval in ms (default: 5000) */
  pollingInterval?: number;
  /** Default slippage percent (default: 5n = 5%) */
  defaultSlippagePercent?: bigint;
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
 * Hook for fetching swap quotes with automatic polling
 *
 * Uses EkuboProvider client if available, otherwise creates a singleton client.
 *
 * @example
 * ```tsx
 * import { useEkuboSwap } from '@provable-games/ekubo-sdk/react';
 *
 * function SwapForm() {
 *   const { state, generateCalls, refetch } = useEkuboSwap({
 *     sellToken: 'ETH',
 *     buyToken: 'USDC',
 *     amount: 1000000000000000000n, // 1 ETH
 *   });
 *
 *   if (state.loading) return <div>Loading quote...</div>;
 *   if (state.error) return <div>Error: {state.error.message}</div>;
 *   if (state.insufficientLiquidity) return <div>Insufficient liquidity</div>;
 *
 *   const handleSwap = () => {
 *     const calls = generateCalls(5n); // 5% slippage
 *     if (calls) {
 *       // Execute calls with your wallet
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <p>You will receive: {state.quote?.total}</p>
 *       <button onClick={handleSwap}>Swap</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEkuboSwap({
  sellToken,
  buyToken,
  amount,
  enabled = true,
  pollingInterval = 5000,
  defaultSlippagePercent = 5n,
  config,
}: UseEkuboSwapProps): UseEkuboSwapResult {
  const contextClient = useOptionalEkuboClient();
  const client = contextClient ?? getDefaultClient(config);

  const [state, setState] = useState<UseEkuboSwapState>({
    quote: null,
    loading: false,
    error: null,
    priceImpact: null,
    insufficientLiquidity: false,
  });

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestQuoteRef = useRef<SwapQuote | null>(null);

  // Normalize and compare addresses
  const isSameToken = useMemo(() => {
    if (!sellToken || !buyToken) return true;
    try {
      return (
        normalizeAddress(sellToken).toLowerCase() ===
        normalizeAddress(buyToken).toLowerCase()
      );
    } catch {
      return false;
    }
  }, [sellToken, buyToken]);

  // Whether we have valid params to fetch a quote
  const canFetch = useMemo(() => {
    return (
      !isSameToken &&
      sellToken !== null &&
      buyToken !== null &&
      amount !== 0n
    );
  }, [isSameToken, sellToken, buyToken, amount]);

  // Whether auto-polling should be active
  const shouldPoll = enabled && canFetch;

  const fetchQuote = useCallback(async () => {
    if (!canFetch || !sellToken || !buyToken) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const quote = await client.getQuote({
        amount,
        tokenFrom: sellToken,
        tokenTo: buyToken,
        signal: abortControllerRef.current.signal,
      });

      latestQuoteRef.current = quote;

      setState({
        quote,
        loading: false,
        error: null,
        priceImpact: quote.impact,
        insufficientLiquidity: false,
      });
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      const isInsufficient = err instanceof InsufficientLiquidityError;

      setState((prev) => ({
        ...prev,
        quote: null,
        loading: false,
        error: err instanceof Error ? err : new Error("Unknown error"),
        priceImpact: null,
        insufficientLiquidity: isInsufficient,
      }));
    }
  }, [canFetch, sellToken, buyToken, amount, client]);

  // Set up polling (only when enabled)
  useEffect(() => {
    // Clean up previous poller
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }

    if (!shouldPoll) {
      // Only reset state if we can't fetch at all (not just disabled polling)
      if (!canFetch) {
        setState({
          quote: null,
          loading: false,
          error: null,
          priceImpact: null,
          insufficientLiquidity: false,
        });
      }
      return;
    }

    // Fetch immediately
    fetchQuote();

    // Set up polling interval
    pollerRef.current = setInterval(fetchQuote, pollingInterval);

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [shouldPoll, canFetch, fetchQuote, pollingInterval]);

  // Generate swap calls from the current quote
  const generateCalls = useCallback(
    (slippagePercent?: bigint, minimumReceived?: bigint): SwapCallsResult | null => {
      const quote = latestQuoteRef.current;
      if (!quote || !sellToken || !buyToken) return null;

      try {
        // Use provided minimumReceived, or calculate from amount (for exact output, amount is what we expect to receive)
        const minReceived = minimumReceived ?? (amount > 0n ? quote.total : amount);

        return client.prepareSwapCalls({
          sellToken,
          buyToken,
          quote,
          minimumReceived: minReceived < 0n ? -minReceived : minReceived,
          slippagePercent: slippagePercent ?? defaultSlippagePercent,
        });
      } catch (err) {
        console.error("Error generating swap calls:", err);
        return null;
      }
    },
    [sellToken, buyToken, amount, defaultSlippagePercent, client]
  );

  const refetch = useCallback(() => {
    fetchQuote();
  }, [fetchQuote]);

  return useMemo(
    () => ({
      state,
      generateCalls,
      refetch,
    }),
    [state, generateCalls, refetch]
  );
}
