import type { TokenInfo } from "../types/token.js";
import { normalizeAddress } from "../utils/hex.js";
import { MAINNET_TOKENS } from "./mainnet.js";

/**
 * Token registry for managing token information and symbol-to-address resolution
 */
export class TokenRegistry {
  private symbolMap: Map<string, TokenInfo> = new Map();
  private addressMap: Map<string, TokenInfo> = new Map();

  constructor(tokens: TokenInfo[] = []) {
    // Register mainnet tokens by default
    for (const token of MAINNET_TOKENS) {
      this.register(token);
    }

    // Register custom tokens
    for (const token of tokens) {
      this.register(token);
    }
  }

  /**
   * Register a token
   */
  register(token: TokenInfo): void {
    const upperSymbol = token.symbol.toUpperCase();
    const normalizedAddress = normalizeAddress(token.address);

    const normalizedToken: TokenInfo = {
      ...token,
      address: normalizedAddress,
    };

    this.symbolMap.set(upperSymbol, normalizedToken);
    this.addressMap.set(normalizedAddress, normalizedToken);
  }

  /**
   * Get token by symbol (case-insensitive)
   */
  getBySymbol(symbol: string): TokenInfo | undefined {
    return this.symbolMap.get(symbol.toUpperCase());
  }

  /**
   * Get token by address (normalized)
   */
  getByAddress(address: string): TokenInfo | undefined {
    return this.addressMap.get(normalizeAddress(address));
  }

  /**
   * Check if a token exists by symbol
   */
  hasSymbol(symbol: string): boolean {
    return this.symbolMap.has(symbol.toUpperCase());
  }

  /**
   * Check if a token exists by address
   */
  hasAddress(address: string): boolean {
    return this.addressMap.has(normalizeAddress(address));
  }

  /**
   * Get all registered tokens
   */
  getAll(): TokenInfo[] {
    return Array.from(this.symbolMap.values());
  }

  /**
   * Get all registered symbols
   */
  getSymbols(): string[] {
    return Array.from(this.symbolMap.keys());
  }
}

/**
 * Default registry instance with mainnet tokens
 */
let defaultRegistry: TokenRegistry | null = null;

/**
 * Get the default token registry (singleton)
 */
export function getDefaultRegistry(): TokenRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new TokenRegistry();
  }
  return defaultRegistry;
}

/**
 * Create a new token registry with custom tokens
 */
export function createTokenRegistry(customTokens: TokenInfo[] = []): TokenRegistry {
  return new TokenRegistry(customTokens);
}
