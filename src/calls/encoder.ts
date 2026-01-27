import type { RouteNode } from "../types/quote.js";
import { toHex } from "../utils/hex.js";

/**
 * Result of encoding a route
 */
export interface EncodedRoute {
  token: string;
  encoded: string[];
}

/**
 * Encode a single route node into calldata format
 */
export function encodeRouteNode(
  routeNode: RouteNode,
  currentToken: string
): { nextToken: string; calldata: string[] } {
  const isToken1 =
    BigInt(currentToken) === BigInt(routeNode.pool_key.token1);
  const nextToken = isToken1
    ? routeNode.pool_key.token0
    : routeNode.pool_key.token1;

  const sqrtRatioLimit = BigInt(routeNode.sqrt_ratio_limit);

  const calldata = [
    routeNode.pool_key.token0,
    routeNode.pool_key.token1,
    routeNode.pool_key.fee,
    toHex(routeNode.pool_key.tick_spacing),
    routeNode.pool_key.extension,
    toHex(sqrtRatioLimit % 2n ** 128n), // low
    toHex(sqrtRatioLimit >> 128n), // high
    toHex(routeNode.skip_ahead),
  ];

  return { nextToken, calldata };
}

/**
 * Encode a full route (array of route nodes) into calldata format
 */
export function encodeRoute(
  route: RouteNode[],
  targetToken: string
): EncodedRoute {
  return route.reduce<EncodedRoute>(
    (memo, routeNode) => {
      const { nextToken, calldata } = encodeRouteNode(routeNode, memo.token);
      return {
        token: nextToken,
        encoded: memo.encoded.concat(calldata),
      };
    },
    {
      token: targetToken,
      encoded: [],
    }
  );
}
