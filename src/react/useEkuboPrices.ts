import { useState, useEffect, useCallback, useMemo } from "react";
import type { EkuboClientConfig } from "../types/index.js";
import { EkuboClient, createEkuboClient } from "../client.js";
import { useOptionalEkuboClient } from "./context.js";

export interface TokenPrices {
  [address: string]: number | undefined;
}

interface TokenLoadingStates {
  [address: string]: boolean;
}

interface TokenErrorStates {
  [address: string]: boolean;
}

export interface UseEkuboPricesResult {
  /** Map of token addresses to USD prices */
  prices: TokenPrices;
  /** Whether any prices are still loading */
  isLoading: boolean;
  /** Check if a specific token is still loading */
  isTokenLoading: (tokenAddress: string) => boolean;
  /** Check if a specific token had an error */
  hasTokenError: (tokenAddress: string) => boolean;
  /** Check if a token has a valid price (loaded, no error) */
  isTokenAvailable: (tokenAddress: string) => boolean;
  /** Get a token's price (returns undefined if not available) */
  getPrice: (tokenAddress: string) => number | undefined;
  /** Manually refetch all prices */
  refetch: () => void;
}

export interface UseEkuboPricesProps {
  /** Array of token addresses to fetch prices for */
  tokens: string[];
  /** Timeout for each price fetch in ms (default: 10000) */
  timeoutMs?: number;
  /** Client config (optional if using EkuboProvider) */
  config?: EkuboClientConfig;
  /** Whether to enable price fetching (default: true) */
  enabled?: boolean;
  /** Standard amount for price calculation (default: 1e18 - 1 token with 18 decimals) */
  standardAmount?: bigint;
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
 * Hook for fetching USD prices for multiple tokens
 *
 * Uses EkuboProvider client if available, otherwise creates a singleton client.
 *
 * @example
 * ```tsx
 * import { useEkuboPrices } from '@provable-games/ekubo-sdk/react';
 *
 * function TokenPrices() {
 *   const {
 *     prices,
 *     isLoading,
 *     getPrice,
 *     isTokenAvailable
 *   } = useEkuboPrices({
 *     tokens: [ETH_ADDRESS, STRK_ADDRESS]
 *   });
 *
 *   if (isLoading) return <div>Loading prices...</div>;
 *
 *   return (
 *     <div>
 *       <p>ETH: ${isTokenAvailable(ETH_ADDRESS) ? getPrice(ETH_ADDRESS) : 'N/A'}</p>
 *       <p>STRK: ${isTokenAvailable(STRK_ADDRESS) ? getPrice(STRK_ADDRESS) : 'N/A'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEkuboPrices({
  tokens,
  timeoutMs = 10000,
  config,
  enabled = true,
  standardAmount = 1000000000000000000n, // 1e18
}: UseEkuboPricesProps): UseEkuboPricesResult {
  const contextClient = useOptionalEkuboClient();
  const client = contextClient ?? getDefaultClient(config);

  const [prices, setPrices] = useState<TokenPrices>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tokenLoadingStates, setTokenLoadingStates] = useState<TokenLoadingStates>({});
  const [tokenErrorStates, setTokenErrorStates] = useState<TokenErrorStates>({});
  const [fetchKey, setFetchKey] = useState(0);

  // Sort token addresses to ensure consistent key regardless of order
  const tokensKey = useMemo(() => JSON.stringify([...tokens].sort()), [tokens]);

  const isTokenAvailable = useCallback(
    (tokenAddress: string): boolean => {
      if (!tokens.includes(tokenAddress)) return false;
      if (tokenLoadingStates[tokenAddress] === true) return false;
      if (tokenErrorStates[tokenAddress] === true) return false;
      if (prices[tokenAddress] === undefined) return false;
      return true;
    },
    [tokens, tokenLoadingStates, tokenErrorStates, prices]
  );

  const isTokenLoading = useCallback(
    (tokenAddress: string): boolean => {
      if (!tokens.includes(tokenAddress)) return true;
      return tokenLoadingStates[tokenAddress] === true;
    },
    [tokens, tokenLoadingStates]
  );

  const hasTokenError = useCallback(
    (tokenAddress: string): boolean => {
      if (!tokens.includes(tokenAddress)) return false;
      return tokenErrorStates[tokenAddress] === true;
    },
    [tokens, tokenErrorStates]
  );

  const getPrice = useCallback(
    (tokenAddress: string): number | undefined => {
      if (!isTokenAvailable(tokenAddress)) {
        return undefined;
      }
      return prices[tokenAddress];
    },
    [isTokenAvailable, prices]
  );

  const refetch = useCallback(() => {
    setFetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !tokens || tokens.length === 0) {
      setIsLoading(false);
      setPrices({});
      setTokenLoadingStates({});
      setTokenErrorStates({});
      return;
    }

    // Reset all states when tokens change
    setIsLoading(true);
    setTokenLoadingStates(
      tokens.reduce((acc, address) => ({ ...acc, [address]: true }), {})
    );
    setTokenErrorStates(
      tokens.reduce((acc, address) => ({ ...acc, [address]: false }), {})
    );

    let cancelled = false;

    const fetchPrices = async () => {
      const pricePromises = tokens.map(async (tokenAddress) => {
        // Create a timeout promise
        const timeoutPromise = new Promise<{
          tokenAddress: string;
          price: number | undefined;
          error: boolean;
        }>((resolve) => {
          setTimeout(() => {
            resolve({
              tokenAddress,
              price: undefined,
              error: true,
            });
          }, timeoutMs);
        });

        // Create the fetch promise
        const fetchPromise = (async () => {
          try {
            const usdcAmount = await client.getUsdcPrice(tokenAddress, standardAmount);
            // USDC has 6 decimals, so divide by 10^6 to get the dollar price
            const price = Number(usdcAmount) / 1e6;
            return { tokenAddress, price, error: false };
          } catch (error) {
            console.error(`Error fetching ${tokenAddress} price:`, error);
            return { tokenAddress, price: undefined, error: true };
          }
        })();

        // Race between the timeout and the fetch
        return Promise.race([fetchPromise, timeoutPromise]);
      });

      const results = await Promise.all(pricePromises);

      if (cancelled) return;

      const newPrices: TokenPrices = {};
      const newLoadingStates: TokenLoadingStates = {};
      const newErrorStates: TokenErrorStates = {};

      results.forEach(({ tokenAddress, price, error }) => {
        newPrices[tokenAddress] = price;
        newLoadingStates[tokenAddress] = false;
        newErrorStates[tokenAddress] = error;
      });

      setPrices(newPrices);
      setTokenLoadingStates(newLoadingStates);
      setTokenErrorStates(newErrorStates);
      setIsLoading(false);
    };

    fetchPrices();

    return () => {
      cancelled = true;
    };
  }, [tokensKey, enabled, timeoutMs, client, standardAmount, fetchKey]);

  return useMemo(
    () => ({
      prices,
      isLoading,
      isTokenLoading,
      hasTokenError,
      isTokenAvailable,
      getPrice,
      refetch,
    }),
    [prices, isLoading, isTokenLoading, hasTokenError, isTokenAvailable, getPrice, refetch]
  );
}
