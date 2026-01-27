import { useState, useEffect, useCallback, useMemo } from "react";
import type { EkuboClientConfig } from "../types/index.js";
import type { PriceDataPoint } from "../api/price.js";
import { EkuboClient, createEkuboClient } from "../client.js";
import { useOptionalEkuboClient } from "./context.js";

export interface UseEkuboPriceHistoryResult {
  /** Array of price data points */
  data: PriceDataPoint[];
  /** Whether price history is loading */
  isLoading: boolean;
  /** Error from fetching price history */
  error: Error | null;
  /** Manually refetch price history */
  refetch: () => void;
}

export interface UseEkuboPriceHistoryProps {
  /** Token to get price for (address or symbol) */
  token: string;
  /** Quote token (address or symbol, e.g., 'USDC') */
  quoteToken: string;
  /** Time interval in seconds (default: 7000) */
  interval?: number;
  /** Client config (optional if using EkuboProvider) */
  config?: EkuboClientConfig;
  /** Whether to enable price history fetching (default: true) */
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
 * Hook for fetching historical price data for a token pair
 *
 * @example
 * ```tsx
 * import { useEkuboPriceHistory } from '@provable-games/ekubo-sdk/react';
 *
 * function PriceChart() {
 *   const { data, isLoading } = useEkuboPriceHistory({
 *     token: 'ETH',
 *     quoteToken: 'USDC',
 *     interval: 3600, // 1 hour intervals
 *   });
 *
 *   if (isLoading) return <div>Loading price history...</div>;
 *
 *   return (
 *     <div>
 *       {data.map((point) => (
 *         <div key={point.timestamp}>
 *           {new Date(point.timestamp * 1000).toLocaleDateString()}: ${point.price}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEkuboPriceHistory({
  token,
  quoteToken,
  interval = 7000,
  config,
  enabled = true,
}: UseEkuboPriceHistoryProps): UseEkuboPriceHistoryResult {
  const contextClient = useOptionalEkuboClient();
  const client = contextClient ?? getDefaultClient(config);

  const [data, setData] = useState<PriceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !token || !quoteToken) {
      setIsLoading(false);
      setData([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchPriceHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await client.getPriceHistory(token, quoteToken, interval);
        if (!cancelled) {
          setData(result.data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch price history"));
          setIsLoading(false);
        }
      }
    };

    fetchPriceHistory();

    return () => {
      cancelled = true;
    };
  }, [enabled, token, quoteToken, interval, client, fetchKey]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch,
    }),
    [data, isLoading, error, refetch]
  );
}
