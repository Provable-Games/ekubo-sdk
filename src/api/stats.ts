import type { FetchConfig } from "../types/index.js";
import { ApiError } from "../errors/index.js";
import { DEFAULT_FETCH_CONFIG, normalizeAddress } from "../utils/index.js";
import { CHAIN_IDS, API_URLS } from "../chains/constants.js";

/**
 * Trading pair statistics
 */
export interface PairStats {
  token0: string;
  token1: string;
  tvl_usd: number;
  volume_24h_usd: number;
  fees_24h_usd: number;
  price: number;
  price_change_24h: number;
}

/**
 * Overview statistics response
 */
export interface OverviewStats {
  tvl_usd: number;
  volume_24h_usd: number;
  fees_24h_usd: number;
}

/**
 * Pool information
 */
export interface PoolInfo {
  key_hash: string;
  token0: string;
  token1: string;
  fee: string;
  tick_spacing: number;
  extension: string;
  tvl_usd: number;
  volume_24h_usd: number;
}

/**
 * TVL data point
 */
export interface TvlDataPoint {
  timestamp: number;
  tvl_usd: number;
}

/**
 * Volume data point
 */
export interface VolumeDataPoint {
  timestamp: number;
  volume_usd: number;
}

/**
 * Base parameters for stats API calls
 */
export interface StatsBaseParams {
  /** Chain ID (Ekubo format) */
  chainId?: string;
  /** API base URL */
  apiUrl?: string;
  /** Fetch configuration */
  fetchConfig?: FetchConfig;
}

/**
 * Parameters for pair-specific queries
 */
export interface PairStatsParams extends StatsBaseParams {
  /** First token address */
  tokenA: string;
  /** Second token address */
  tokenB: string;
}

/**
 * Fetch overview of top trading pairs
 */
export async function fetchTopPairs(
  params: StatsBaseParams = {}
): Promise<PairStats[]> {
  const {
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const url = `${apiUrl}/overview/pairs?chainId=${chainId}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch top pairs: ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as PairStats[];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to fetch top pairs: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch protocol TVL overview
 */
export async function fetchTvl(
  params: StatsBaseParams = {}
): Promise<OverviewStats> {
  const {
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const url = `${apiUrl}/overview/tvl?chainId=${chainId}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch TVL: ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as OverviewStats;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to fetch TVL: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch protocol volume overview
 */
export async function fetchVolume(
  params: StatsBaseParams = {}
): Promise<OverviewStats> {
  const {
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const url = `${apiUrl}/overview/volume?chainId=${chainId}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch volume: ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as OverviewStats;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to fetch volume: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch TVL for a specific trading pair
 */
export async function fetchPairTvl(
  params: PairStatsParams
): Promise<TvlDataPoint[]> {
  const {
    tokenA,
    tokenB,
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const normalizedA = normalizeAddress(tokenA);
  const normalizedB = normalizeAddress(tokenB);

  const url = `${apiUrl}/pair/${chainId}/${normalizedA}/${normalizedB}/tvl`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch pair TVL: ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as TvlDataPoint[];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to fetch pair TVL: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch volume for a specific trading pair
 */
export async function fetchPairVolume(
  params: PairStatsParams
): Promise<VolumeDataPoint[]> {
  const {
    tokenA,
    tokenB,
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const normalizedA = normalizeAddress(tokenA);
  const normalizedB = normalizeAddress(tokenB);

  const url = `${apiUrl}/pair/${chainId}/${normalizedA}/${normalizedB}/volume`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch pair volume: ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as VolumeDataPoint[];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to fetch pair volume: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch pools for a specific trading pair
 */
export async function fetchPairPools(
  params: PairStatsParams
): Promise<PoolInfo[]> {
  const {
    tokenA,
    tokenB,
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const normalizedA = normalizeAddress(tokenA);
  const normalizedB = normalizeAddress(tokenB);

  const url = `${apiUrl}/pair/${chainId}/${normalizedA}/${normalizedB}/pools`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch pair pools: ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as PoolInfo[];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to fetch pair pools: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}
