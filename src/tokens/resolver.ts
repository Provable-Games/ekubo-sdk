import type { TokenInfo } from "../types/token.js";
import { isAddress, normalizeAddress } from "../utils/hex.js";
import { TokenNotFoundError } from "../errors/index.js";
import { TokenRegistry, getDefaultRegistry } from "./registry.js";

/**
 * Resolve a token identifier (symbol or address) to a normalized address
 *
 * @param tokenIdentifier - Token symbol (e.g., "ETH") or address
 * @param registry - Optional token registry (defaults to mainnet tokens)
 * @returns Normalized address
 * @throws TokenNotFoundError if symbol is not found in registry
 */
export function resolveToken(
  tokenIdentifier: string,
  registry?: TokenRegistry
): string {
  const reg = registry ?? getDefaultRegistry();

  // If it's already an address, normalize and return
  if (isAddress(tokenIdentifier)) {
    return normalizeAddress(tokenIdentifier);
  }

  // Try to resolve as symbol
  const token = reg.getBySymbol(tokenIdentifier);
  if (token) {
    return token.address;
  }

  throw new TokenNotFoundError(tokenIdentifier);
}

/**
 * Resolve a token identifier to full token info
 *
 * @param tokenIdentifier - Token symbol or address
 * @param registry - Optional token registry
 * @returns TokenInfo or undefined if not found
 */
export function resolveTokenInfo(
  tokenIdentifier: string,
  registry?: TokenRegistry
): TokenInfo | undefined {
  const reg = registry ?? getDefaultRegistry();

  // If it's an address, try to find in registry
  if (isAddress(tokenIdentifier)) {
    return reg.getByAddress(tokenIdentifier);
  }

  // Try to resolve as symbol
  return reg.getBySymbol(tokenIdentifier);
}

/**
 * Check if a token identifier can be resolved
 */
export function canResolveToken(
  tokenIdentifier: string,
  registry?: TokenRegistry
): boolean {
  // Addresses can always be resolved
  if (isAddress(tokenIdentifier)) {
    return true;
  }

  // Check if symbol exists in registry
  const reg = registry ?? getDefaultRegistry();
  return reg.hasSymbol(tokenIdentifier);
}
