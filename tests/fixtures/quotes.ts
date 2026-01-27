import type { SwapQuote, SwapSplit, RouteNode } from "../../src/types/quote.js";

/**
 * Mock route node for testing
 */
export const MOCK_ROUTE_NODE: RouteNode = {
  pool_key: {
    token0: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", // ETH
    token1: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", // STRK
    fee: "0x20c49ba5e353f80000000000000000",
    tick_spacing: 200,
    extension: "0x0",
  },
  sqrt_ratio_limit: "18446748437148339061",
  skip_ahead: 0,
};

/**
 * Mock single-route split
 */
export const MOCK_SINGLE_SPLIT: SwapSplit = {
  amount_specified: "-1000000000000000000",
  route: [MOCK_ROUTE_NODE],
};

/**
 * Mock multi-route splits
 */
export const MOCK_MULTI_SPLITS: SwapSplit[] = [
  {
    amount_specified: "-500000000000000000",
    route: [MOCK_ROUTE_NODE],
  },
  {
    amount_specified: "-500000000000000000",
    route: [
      {
        ...MOCK_ROUTE_NODE,
        pool_key: {
          ...MOCK_ROUTE_NODE.pool_key,
          fee: "0x68db8bac710cb4000000000000000",
        },
      },
    ],
  },
];

/**
 * Mock single-route quote
 */
export const MOCK_SINGLE_ROUTE_QUOTE: SwapQuote = {
  impact: 0.01,
  total: 50000000000000000000n, // 50 STRK
  splits: [MOCK_SINGLE_SPLIT],
};

/**
 * Mock multi-route quote
 */
export const MOCK_MULTI_ROUTE_QUOTE: SwapQuote = {
  impact: 0.005,
  total: 51000000000000000000n, // 51 STRK
  splits: MOCK_MULTI_SPLITS,
};

/**
 * Mock empty quote
 */
export const MOCK_EMPTY_QUOTE: SwapQuote = {
  impact: 0,
  total: 0n,
  splits: [],
};

/**
 * Mock API response
 */
export const MOCK_API_RESPONSE = {
  price_impact: 0.01,
  total_calculated: "-50000000000000000000",
  splits: [MOCK_SINGLE_SPLIT],
};

/**
 * Test token addresses
 */
export const TEST_ADDRESSES = {
  ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  USDC: "0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb",
  LORDS: "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
};
