import type { SwapQuote, SwapSplit } from "../types/quote.js";
import type { SwapCall, SwapCallsResult } from "../types/calls.js";
import { encodeRoute } from "./encoder.js";
import { toHex, normalizeAddress } from "../utils/hex.js";
import { abs, addSlippage } from "../utils/bigint.js";
import { ROUTER_ADDRESSES, CHAIN_IDS } from "../chains/constants.js";
import { InvalidChainError } from "../errors/index.js";

/**
 * Default slippage percentage (5%)
 */
const DEFAULT_SLIPPAGE_PERCENT = 5n;

/**
 * Parameters for generating swap calls
 */
export interface GenerateSwapCallsParams {
  /** Token being sold (address) */
  sellToken: string;
  /** Token being bought (address) */
  buyToken: string;
  /** Minimum amount of buyToken to receive */
  minimumReceived: bigint;
  /** Quote from Ekubo API */
  quote: SwapQuote;
  /** Chain ID (Ekubo format) */
  chainId?: string;
  /** Router contract address (overrides chainId lookup) */
  routerAddress?: string;
  /** Slippage percentage for transfer amount (default: 5n = 5%) */
  slippagePercent?: bigint;
}

/**
 * Generate swap calls for Ekubo router
 *
 * This generates the calls needed to execute a swap:
 * 1. Transfer tokens to router
 * 2. Execute multihop_swap or multi_multihop_swap
 * 3. Clear minimum profits
 * 4. Clear remaining tokens
 */
export function generateSwapCalls(
  params: GenerateSwapCallsParams
): SwapCallsResult {
  const {
    sellToken,
    buyToken,
    minimumReceived,
    quote,
    chainId = CHAIN_IDS.MAINNET,
    routerAddress: customRouterAddress,
    slippagePercent = DEFAULT_SLIPPAGE_PERCENT,
  } = params;

  // Get router address
  const routerAddress =
    customRouterAddress ??
    ROUTER_ADDRESSES[chainId as keyof typeof ROUTER_ADDRESSES];

  if (!routerAddress) {
    throw new InvalidChainError(
      chainId,
      `Router address not found for chain ID: ${chainId}`
    );
  }

  // Normalize addresses
  const normalizedSellToken = normalizeAddress(sellToken);
  const normalizedBuyToken = normalizeAddress(buyToken);

  // Add slippage buffer to transfer amount
  const totalWithSlippage = addSlippage(quote.total, slippagePercent);

  // Transfer tokens to router
  const transferCall: SwapCall = {
    contractAddress: normalizedSellToken,
    entrypoint: "transfer",
    calldata: [routerAddress, toHex(totalWithSlippage), "0x0"],
  };

  // Clear remaining tokens after swap
  const clearCall: SwapCall = {
    contractAddress: routerAddress,
    entrypoint: "clear",
    calldata: [normalizedSellToken],
  };

  // Return early if no valid quote
  if (!quote || quote.splits.length === 0) {
    return {
      transferCall,
      swapCalls: [],
      clearCall,
      allCalls: [transferCall, clearCall],
    };
  }

  const { splits } = quote;

  // Clear minimum profits call
  const clearMinimumCall: SwapCall = {
    contractAddress: routerAddress,
    entrypoint: "clear_minimum",
    calldata: [normalizedBuyToken, toHex(minimumReceived), "0x0"],
  };

  let swapCalls: SwapCall[];

  if (splits.length === 1) {
    // Single route swap
    swapCalls = generateSingleRouteSwap(
      splits[0]!,
      normalizedBuyToken,
      routerAddress
    );
  } else {
    // Multiple routes swap
    swapCalls = generateMultiRouteSwap(
      splits,
      normalizedBuyToken,
      routerAddress
    );
  }

  // Add clear_minimum after swap
  swapCalls.push(clearMinimumCall);

  return {
    transferCall,
    swapCalls,
    clearCall,
    allCalls: [transferCall, ...swapCalls, clearCall],
  };
}

/**
 * Generate calls for a single-route swap (multihop_swap)
 */
function generateSingleRouteSwap(
  split: SwapSplit,
  targetToken: string,
  routerAddress: string
): SwapCall[] {
  const routeCalldata = encodeRoute(split.route, targetToken);

  const amountSpecified = BigInt(split.amount_specified);
  const absAmount = abs(amountSpecified);

  return [
    {
      contractAddress: routerAddress,
      entrypoint: "multihop_swap",
      calldata: [
        toHex(split.route.length),
        ...routeCalldata.encoded,
        targetToken,
        toHex(absAmount),
        "0x1", // is_exact_amount_received flag
      ],
    },
  ];
}

/**
 * Generate calls for a multi-route swap (multi_multihop_swap)
 */
function generateMultiRouteSwap(
  splits: SwapSplit[],
  targetToken: string,
  routerAddress: string
): SwapCall[] {
  const multiRouteCalldata = splits.reduce<string[]>((memo, split) => {
    const routeCalldata = encodeRoute(split.route, targetToken);

    const amountSpecified = BigInt(split.amount_specified);
    const absAmount = abs(amountSpecified);

    return memo.concat([
      toHex(split.route.length),
      ...routeCalldata.encoded,
      targetToken,
      toHex(absAmount),
      "0x1", // is_exact_amount_received flag
    ]);
  }, []);

  return [
    {
      contractAddress: routerAddress,
      entrypoint: "multi_multihop_swap",
      calldata: [toHex(splits.length), ...multiRouteCalldata],
    },
  ];
}

/**
 * Prepare swap calls with approval included
 * This is a convenience wrapper that adds the ERC20 approve call
 */
export function prepareSwapCalls(
  params: GenerateSwapCallsParams
): SwapCallsResult & { approveCall: SwapCall } {
  const result = generateSwapCalls(params);

  const {
    sellToken,
    quote,
    chainId = CHAIN_IDS.MAINNET,
    routerAddress: customRouterAddress,
    slippagePercent = DEFAULT_SLIPPAGE_PERCENT,
  } = params;

  const routerAddress =
    customRouterAddress ??
    ROUTER_ADDRESSES[chainId as keyof typeof ROUTER_ADDRESSES];

  if (!routerAddress) {
    throw new InvalidChainError(
      chainId,
      `Router address not found for chain ID: ${chainId}`
    );
  }

  const normalizedSellToken = normalizeAddress(sellToken);
  const totalWithSlippage = addSlippage(quote.total, slippagePercent);

  // Generate approve call
  const approveCall: SwapCall = {
    contractAddress: normalizedSellToken,
    entrypoint: "approve",
    calldata: [routerAddress, toHex(totalWithSlippage), "0x0"],
  };

  return {
    ...result,
    approveCall,
    allCalls: [approveCall, ...result.allCalls],
  };
}
