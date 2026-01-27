import { useState, useEffect, useCallback, useMemo } from "react";
import type { EkuboClientConfig } from "../types/index.js";
import type { OverviewStats, PairStats } from "../api/stats.js";
import { EkuboClient, createEkuboClient } from "../client.js";
import { useOptionalEkuboClient } from "./context.js";

export interface UseEkuboStatsResult {
  /** Protocol TVL statistics */
  tvl: OverviewStats | null;
  /** Protocol volume statistics */
  volume: OverviewStats | null;
  /** Top trading pairs */
  topPairs: PairStats[];
  /** Whether stats are loading */
  isLoading: boolean;
  /** Error from fetching stats */
  error: Error | null;
  /** Manually refetch stats */
  refetch: () => void;
}

export interface UseEkuboStatsProps {
  /** Client config (optional if using EkuboProvider) */
  config?: EkuboClientConfig;
  /** Whether to enable stats fetching (default: true) */
  enabled?: boolean;
  /** Whether to fetch TVL (default: true) */
  fetchTvl?: boolean;
  /** Whether to fetch volume (default: true) */
  fetchVolume?: boolean;
  /** Whether to fetch top pairs (default: true) */
  fetchTopPairs?: boolean;
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
 * Hook for fetching Ekubo protocol statistics (TVL, volume, top pairs)
 *
 * @example
 * ```tsx
 * import { useEkuboStats } from '@provable-games/ekubo-sdk/react';
 *
 * function ProtocolStats() {
 *   const { tvl, volume, topPairs, isLoading } = useEkuboStats();
 *
 *   if (isLoading) return <div>Loading stats...</div>;
 *
 *   return (
 *     <div>
 *       <h2>Protocol Statistics</h2>
 *       {tvl && <p>TVL: ${tvl.total.toLocaleString()}</p>}
 *       {volume && <p>24h Volume: ${volume.total.toLocaleString()}</p>}
 *       <h3>Top Pairs</h3>
 *       <ul>
 *         {topPairs.slice(0, 5).map((pair, i) => (
 *           <li key={i}>{pair.token0Symbol}/{pair.token1Symbol}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEkuboStats({
  config,
  enabled = true,
  fetchTvl = true,
  fetchVolume = true,
  fetchTopPairs = true,
}: UseEkuboStatsProps = {}): UseEkuboStatsResult {
  const contextClient = useOptionalEkuboClient();
  const client = contextClient ?? getDefaultClient(config);

  const [tvl, setTvl] = useState<OverviewStats | null>(null);
  const [volume, setVolume] = useState<OverviewStats | null>(null);
  const [topPairs, setTopPairs] = useState<PairStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setTvl(null);
      setVolume(null);
      setTopPairs([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const promises: Promise<void>[] = [];

        if (fetchTvl) {
          promises.push(
            client.getTvl().then((result) => {
              if (!cancelled) setTvl(result);
            })
          );
        }

        if (fetchVolume) {
          promises.push(
            client.getVolume().then((result) => {
              if (!cancelled) setVolume(result);
            })
          );
        }

        if (fetchTopPairs) {
          promises.push(
            client.getTopPairs().then((result) => {
              if (!cancelled) setTopPairs(result);
            })
          );
        }

        await Promise.all(promises);

        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch stats"));
          setIsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [enabled, client, fetchKey, fetchTvl, fetchVolume, fetchTopPairs]);

  return useMemo(
    () => ({
      tvl,
      volume,
      topPairs,
      isLoading,
      error,
      refetch,
    }),
    [tvl, volume, topPairs, isLoading, error, refetch]
  );
}
