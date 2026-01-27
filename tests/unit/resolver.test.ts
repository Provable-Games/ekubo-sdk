import { describe, it, expect } from "vitest";
import {
  resolveToken,
  resolveTokenInfo,
  canResolveToken,
  TokenRegistry,
} from "../../src/tokens/index.js";
import { TokenNotFoundError } from "../../src/errors/index.js";
import { TEST_ADDRESSES } from "../fixtures/quotes.js";

// Helper to compare addresses (normalizes by converting to BigInt)
function addressesEqual(a: string, b: string): boolean {
  return BigInt(a) === BigInt(b);
}

describe("resolveToken", () => {
  it("should resolve known symbols", () => {
    const ethAddress = resolveToken("ETH");
    expect(addressesEqual(ethAddress, TEST_ADDRESSES.ETH)).toBe(true);

    const strkAddress = resolveToken("STRK");
    expect(addressesEqual(strkAddress, TEST_ADDRESSES.STRK)).toBe(true);
  });

  it("should be case-insensitive for symbols", () => {
    const lower = resolveToken("eth");
    const upper = resolveToken("ETH");
    const mixed = resolveToken("Eth");

    expect(lower).toBe(upper);
    expect(lower).toBe(mixed);
  });

  it("should pass through addresses", () => {
    const address = resolveToken(TEST_ADDRESSES.ETH);
    expect(addressesEqual(address, TEST_ADDRESSES.ETH)).toBe(true);
  });

  it("should normalize addresses", () => {
    const withLeadingZeros = resolveToken(
      "0x00049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
    );
    const withoutLeadingZeros = resolveToken(TEST_ADDRESSES.ETH);

    expect(withLeadingZeros).toBe(withoutLeadingZeros);
  });

  it("should throw TokenNotFoundError for unknown symbols", () => {
    expect(() => resolveToken("UNKNOWN")).toThrow(TokenNotFoundError);
  });

  it("should use custom registry", () => {
    const registry = new TokenRegistry([
      { symbol: "CUSTOM", address: "0x123", decimals: 18 },
    ]);

    const address = resolveToken("CUSTOM", registry);
    expect(address).toBe("0x123");
  });
});

describe("resolveTokenInfo", () => {
  it("should return full token info for symbols", () => {
    const info = resolveTokenInfo("ETH");

    expect(info).toBeDefined();
    expect(info?.symbol).toBe("ETH");
    expect(info?.decimals).toBe(18);
    expect(info?.name).toBe("Ether");
  });

  it("should return token info for addresses", () => {
    const info = resolveTokenInfo(TEST_ADDRESSES.STRK);

    expect(info).toBeDefined();
    expect(info?.symbol).toBe("STRK");
  });

  it("should return undefined for unknown tokens", () => {
    const info = resolveTokenInfo("UNKNOWN");
    expect(info).toBeUndefined();
  });
});

describe("canResolveToken", () => {
  it("should return true for known symbols", () => {
    expect(canResolveToken("ETH")).toBe(true);
    expect(canResolveToken("STRK")).toBe(true);
    expect(canResolveToken("USDC")).toBe(true);
  });

  it("should return true for addresses", () => {
    expect(canResolveToken(TEST_ADDRESSES.ETH)).toBe(true);
    expect(canResolveToken("0x123")).toBe(true);
  });

  it("should return false for unknown symbols", () => {
    expect(canResolveToken("UNKNOWN")).toBe(false);
    expect(canResolveToken("XYZ")).toBe(false);
  });
});

describe("TokenRegistry", () => {
  it("should register custom tokens", () => {
    const registry = new TokenRegistry();
    registry.register({
      symbol: "CUSTOM",
      address: "0x456",
      decimals: 8,
      name: "Custom Token",
    });

    const token = registry.getBySymbol("CUSTOM");
    expect(token).toBeDefined();
    expect(token?.decimals).toBe(8);
  });

  it("should include mainnet tokens by default", () => {
    const registry = new TokenRegistry();

    expect(registry.hasSymbol("ETH")).toBe(true);
    expect(registry.hasSymbol("STRK")).toBe(true);
    expect(registry.hasSymbol("LORDS")).toBe(true);
  });

  it("should get all registered symbols", () => {
    const registry = new TokenRegistry();
    const symbols = registry.getSymbols();

    expect(symbols).toContain("ETH");
    expect(symbols).toContain("STRK");
    expect(symbols.length).toBeGreaterThan(5);
  });

  it("should look up by address", () => {
    const registry = new TokenRegistry();
    const token = registry.getByAddress(TEST_ADDRESSES.ETH);

    expect(token).toBeDefined();
    expect(token?.symbol).toBe("ETH");
  });
});
