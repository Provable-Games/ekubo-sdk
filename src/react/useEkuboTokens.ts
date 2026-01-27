import { useState, useEffect, useCallback, useMemo } from "react";
import type { EkuboClientConfig } from "../types/index.js";
import type { ApiTokenInfo } from "../api/tokens.js";
import { EkuboClient, createEkuboClient } from "../client.js";
import { useOptionalEkuboClient } from "./context.js";

export interface UseEkuboTokensResult {
  /** Array of tokens from the API */
  tokens: ApiTokenInfo[];
  /** Whether tokens are loading */
  isLoading: boolean;
  /** Error from fetching tokens */
  error: Error | null;
  /** Manually refetch tokens */
  refetch: () => void;
  /** Get a token by address */
  getToken: (address: string) => ApiTokenInfo | undefined;
  /** Get a token by symbol */
  getTokenBySymbol: (symbol: string) => ApiTokenInfo | undefined;
}

export interface UseEkuboTokensProps {
  /** Client config (optional if using EkuboProvider) */
  config?: EkuboClientConfig;
  /** Whether to enable token fetching (default: true) */
  enabled?: boolean;
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
 * Hook for fetching the list of available tokens from Ekubo API
 *
 * @example
 * ```tsx
 * import { useEkuboTokens } from '@provable-games/ekubo-sdk/react';
 *
 * function TokenList() {
 *   const { tokens, isLoading, getTokenBySymbol } = useEkuboTokens();
 *
 *   if (isLoading) return <div>Loading tokens...</div>;
 *
 *   const eth = getTokenBySymbol('ETH');
 *
 *   return (
 *     <ul>
 *       {tokens.map(token => (
 *         <li key={token.address}>{token.symbol}: {token.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useEkuboTokens({
  config,
  enabled = true,
}: UseEkuboTokensProps = {}): UseEkuboTokensResult {
  const contextClient = useOptionalEkuboClient();
  const client = contextClient ?? getDefaultClient(config);

  const [tokens, setTokens] = useState<ApiTokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setTokens([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchTokens = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await client.fetchTokens();
        if (!cancelled) {
          setTokens(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch tokens"));
          setIsLoading(false);
        }
      }
    };

    fetchTokens();

    return () => {
      cancelled = true;
    };
  }, [enabled, client, fetchKey]);

  // Create lookup maps for efficient token access
  const tokensByAddress = useMemo(() => {
    const map = new Map<string, ApiTokenInfo>();
    for (const token of tokens) {
      map.set(token.address.toLowerCase(), token);
    }
    return map;
  }, [tokens]);

  const tokensBySymbol = useMemo(() => {
    const map = new Map<string, ApiTokenInfo>();
    for (const token of tokens) {
      map.set(token.symbol.toUpperCase(), token);
    }
    return map;
  }, [tokens]);

  const getToken = useCallback(
    (address: string): ApiTokenInfo | undefined => {
      return tokensByAddress.get(address.toLowerCase());
    },
    [tokensByAddress]
  );

  const getTokenBySymbol = useCallback(
    (symbol: string): ApiTokenInfo | undefined => {
      return tokensBySymbol.get(symbol.toUpperCase());
    },
    [tokensBySymbol]
  );

  return useMemo(
    () => ({
      tokens,
      isLoading,
      error,
      refetch,
      getToken,
      getTokenBySymbol,
    }),
    [tokens, isLoading, error, refetch, getToken, getTokenBySymbol]
  );
}
