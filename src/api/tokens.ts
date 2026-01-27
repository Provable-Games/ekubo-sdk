import type { FetchConfig } from "../types/index.js";
import { ApiError } from "../errors/index.js";
import { DEFAULT_FETCH_CONFIG } from "../utils/index.js";
import { CHAIN_IDS, API_URLS } from "../chains/constants.js";

/**
 * Token metadata from Ekubo API
 */
export interface ApiTokenInfo {
  /** Token contract address */
  address: string;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Logo URI (optional) */
  logo_uri?: string;
  /** Whether token is verified/trusted */
  verified?: boolean;
}

/**
 * Parameters for fetching tokens
 */
export interface FetchTokensParams {
  /** Chain ID (Ekubo format) */
  chainId?: string;
  /** API base URL */
  apiUrl?: string;
  /** Fetch configuration */
  fetchConfig?: FetchConfig;
}

/**
 * Parameters for fetching a single token
 */
export interface FetchTokenParams extends FetchTokensParams {
  /** Token contract address */
  tokenAddress: string;
}

/**
 * Parameters for batch fetching tokens
 */
export interface FetchTokensBatchParams extends FetchTokensParams {
  /** Token contract addresses */
  tokenAddresses: string[];
}

/**
 * Fetch list of all tokens for a chain
 */
export async function fetchTokens(
  params: FetchTokensParams = {}
): Promise<ApiTokenInfo[]> {
  const {
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const url = `${apiUrl}/tokens?chainId=${chainId}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch tokens: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    return data as ApiTokenInfo[];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Failed to fetch tokens: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch metadata for a single token
 */
export async function fetchToken(
  params: FetchTokenParams
): Promise<ApiTokenInfo | null> {
  const {
    tokenAddress,
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const url = `${apiUrl}/tokens/${chainId}/${tokenAddress}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch token: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    return data as ApiTokenInfo;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Failed to fetch token: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}

/**
 * Fetch metadata for multiple tokens at once
 */
export async function fetchTokensBatch(
  params: FetchTokensBatchParams
): Promise<ApiTokenInfo[]> {
  const {
    tokenAddresses,
    chainId = CHAIN_IDS.MAINNET,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  if (tokenAddresses.length === 0) {
    return [];
  }

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  // Build query string with multiple addresses
  const addressParams = tokenAddresses
    .map((addr) => `addresses=${encodeURIComponent(addr)}`)
    .join("&");

  const url = `${apiUrl}/tokens/batch?chainId=${chainId}&${addressParams}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch tokens batch: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    return data as ApiTokenInfo[];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Failed to fetch tokens batch: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}
