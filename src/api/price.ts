import type { FetchConfig } from "../types/index.js";
import { ApiError } from "../errors/index.js";
import { DEFAULT_FETCH_CONFIG, normalizeAddress } from "../utils/index.js";
import { CHAIN_IDS, API_URLS } from "../chains/constants.js";

/**
 * Price history data point
 */
export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

/**
 * Price history response
 */
export interface PriceHistoryResponse {
  data: PriceDataPoint[];
}

/**
 * Parameters for getPriceHistory
 */
export interface GetPriceHistoryParams {
  /** Token to get price for */
  token: string;
  /** Quote token (e.g., USDC) */
  otherToken: string;
  /** Chain ID (Ekubo format) */
  chainId?: string;
  /** Time interval in seconds */
  interval?: number;
  /** API base URL */
  apiUrl?: string;
  /** Fetch configuration */
  fetchConfig?: FetchConfig;
}

/**
 * Fetch price history from Ekubo API
 */
export async function getPriceHistory(
  params: GetPriceHistoryParams
): Promise<PriceHistoryResponse> {
  const {
    token,
    otherToken,
    chainId = CHAIN_IDS.MAINNET,
    interval = 7000,
    apiUrl = API_URLS.API,
    fetchConfig = {},
  } = params;

  const config = { ...DEFAULT_FETCH_CONFIG, ...fetchConfig };
  const fetchFn = config.fetch;

  const normalizedToken = normalizeAddress(token);
  const normalizedOtherToken = normalizeAddress(otherToken);

  const url = `${apiUrl}/price/${chainId}/${normalizedToken}/${normalizedOtherToken}/history?interval=${interval}`;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch price history: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();

    return {
      data: data?.data || [],
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Failed to fetch price history: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}
