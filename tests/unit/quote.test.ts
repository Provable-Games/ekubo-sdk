import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSwapQuote, fetchSwapQuoteInUsdc } from "../../src/api/quote.js";
import { InsufficientLiquidityError, ApiError } from "../../src/errors/index.js";
import { CHAIN_IDS } from "../../src/chains/constants.js";
import { MOCK_API_RESPONSE, TEST_ADDRESSES } from "../fixtures/quotes.js";

describe("fetchSwapQuote", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should fetch and parse a quote successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_API_RESPONSE),
    });

    const quote = await fetchSwapQuote({
      amount: 1000000000000000000n,
      tokenFrom: TEST_ADDRESSES.ETH,
      tokenTo: TEST_ADDRESSES.STRK,
      chainId: CHAIN_IDS.MAINNET,
      fetchConfig: { fetch: mockFetch },
    });

    expect(quote.impact).toBe(0.01);
    expect(quote.total).toBe(50000000000000000000n);
    expect(quote.splits).toHaveLength(1);
  });

  it("should handle string total_calculated", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...MOCK_API_RESPONSE,
          total_calculated: "-100",
        }),
    });

    const quote = await fetchSwapQuote({
      amount: 100n,
      tokenFrom: TEST_ADDRESSES.ETH,
      tokenTo: TEST_ADDRESSES.STRK,
      fetchConfig: { fetch: mockFetch },
    });

    expect(quote.total).toBe(100n);
  });

  it("should handle number total_calculated", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...MOCK_API_RESPONSE,
          total_calculated: -100,
        }),
    });

    const quote = await fetchSwapQuote({
      amount: 100n,
      tokenFrom: TEST_ADDRESSES.ETH,
      tokenTo: TEST_ADDRESSES.STRK,
      fetchConfig: { fetch: mockFetch },
    });

    expect(quote.total).toBe(100n);
  });

  it("should throw InsufficientLiquidityError", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          error: "Insufficient liquidity for swap",
        }),
    });

    await expect(
      fetchSwapQuote({
        amount: 1000000000000000000n,
        tokenFrom: TEST_ADDRESSES.ETH,
        tokenTo: TEST_ADDRESSES.STRK,
        fetchConfig: { fetch: mockFetch },
      })
    ).rejects.toThrow(InsufficientLiquidityError);
  });

  it("should throw InsufficientLiquidityError on 404 with liquidity message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          error: "Insufficient liquidity for swap",
        }),
    });

    await expect(
      fetchSwapQuote({
        amount: 1000000000000000000n,
        tokenFrom: TEST_ADDRESSES.ETH,
        tokenTo: TEST_ADDRESSES.STRK,
        fetchConfig: { fetch: mockFetch, maxRetries: 1 },
      })
    ).rejects.toThrow(InsufficientLiquidityError);
  });

  it("should retry on 429 and succeed", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([["Retry-After", "0"]]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_API_RESPONSE),
      });

    const quote = await fetchSwapQuote({
      amount: 1000000000000000000n,
      tokenFrom: TEST_ADDRESSES.ETH,
      tokenTo: TEST_ADDRESSES.STRK,
      fetchConfig: { fetch: mockFetch, baseBackoff: 10, maxBackoff: 50 },
    });

    expect(quote.total).toBe(50000000000000000000n);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should normalize addresses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_API_RESPONSE),
    });

    await fetchSwapQuote({
      amount: 1n,
      tokenFrom: "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      tokenTo: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      fetchConfig: { fetch: mockFetch },
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7");
  });
});

describe("fetchSwapQuoteInUsdc", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("should fetch USDC price", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...MOCK_API_RESPONSE,
          total_calculated: "-1000000", // 1 USDC
        }),
    });

    const price = await fetchSwapQuoteInUsdc({
      amount: 1000000000000000000n,
      tokenFrom: TEST_ADDRESSES.ETH,
      chainId: CHAIN_IDS.MAINNET,
      fetchConfig: { fetch: mockFetch },
    });

    expect(price).toBe(1000000n);
  });
});
