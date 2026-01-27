import { describe, it, expect } from "vitest";
import { generateSwapCalls, prepareSwapCalls } from "../../src/calls/generator.js";
import { CHAIN_IDS, ROUTER_ADDRESSES } from "../../src/chains/constants.js";
import {
  MOCK_SINGLE_ROUTE_QUOTE,
  MOCK_MULTI_ROUTE_QUOTE,
  MOCK_EMPTY_QUOTE,
  TEST_ADDRESSES,
} from "../fixtures/quotes.js";

// Helper to compare addresses (normalizes by converting to BigInt)
function addressesEqual(a: string, b: string): boolean {
  return BigInt(a) === BigInt(b);
}

describe("generateSwapCalls", () => {
  const baseParams = {
    sellToken: TEST_ADDRESSES.ETH,
    buyToken: TEST_ADDRESSES.STRK,
    minimumReceived: 49000000000000000000n,
    chainId: CHAIN_IDS.MAINNET,
  };

  it("should generate calls for single-route swap", () => {
    const result = generateSwapCalls({
      ...baseParams,
      quote: MOCK_SINGLE_ROUTE_QUOTE,
    });

    expect(result.transferCall.entrypoint).toBe("transfer");
    expect(
      addressesEqual(result.transferCall.contractAddress, TEST_ADDRESSES.ETH)
    ).toBe(true);

    expect(result.swapCalls).toHaveLength(2);
    expect(result.swapCalls[0]?.entrypoint).toBe("multihop_swap");
    expect(result.swapCalls[1]?.entrypoint).toBe("clear_minimum");

    expect(result.clearCall.entrypoint).toBe("clear");
    expect(result.allCalls).toHaveLength(4);
  });

  it("should generate calls for multi-route swap", () => {
    const result = generateSwapCalls({
      ...baseParams,
      quote: MOCK_MULTI_ROUTE_QUOTE,
    });

    expect(result.swapCalls).toHaveLength(2);
    expect(result.swapCalls[0]?.entrypoint).toBe("multi_multihop_swap");
    expect(result.swapCalls[1]?.entrypoint).toBe("clear_minimum");
    expect(result.allCalls).toHaveLength(4);
  });

  it("should handle empty quote", () => {
    const result = generateSwapCalls({
      ...baseParams,
      quote: MOCK_EMPTY_QUOTE,
    });

    expect(result.swapCalls).toHaveLength(0);
    expect(result.allCalls).toHaveLength(2);
    expect(result.allCalls[0]?.entrypoint).toBe("transfer");
    expect(result.allCalls[1]?.entrypoint).toBe("clear");
  });

  it("should apply slippage to transfer amount", () => {
    const result = generateSwapCalls({
      ...baseParams,
      quote: MOCK_SINGLE_ROUTE_QUOTE,
      slippagePercent: 10n,
    });

    // 50 STRK + 10% = 55 STRK
    const transferAmount = BigInt(result.transferCall.calldata[1]!);
    expect(transferAmount).toBe(55000000000000000000n);
  });

  it("should use correct router address", () => {
    const result = generateSwapCalls({
      ...baseParams,
      quote: MOCK_SINGLE_ROUTE_QUOTE,
    });

    expect(result.swapCalls[0]?.contractAddress).toBe(
      ROUTER_ADDRESSES[CHAIN_IDS.MAINNET]
    );
  });

  it("should use custom router address when provided", () => {
    const customRouter = "0x123456789";
    const result = generateSwapCalls({
      ...baseParams,
      quote: MOCK_SINGLE_ROUTE_QUOTE,
      routerAddress: customRouter,
    });

    expect(result.swapCalls[0]?.contractAddress).toBe(customRouter);
  });
});

describe("prepareSwapCalls", () => {
  const baseParams = {
    sellToken: TEST_ADDRESSES.ETH,
    buyToken: TEST_ADDRESSES.STRK,
    minimumReceived: 49000000000000000000n,
    quote: MOCK_SINGLE_ROUTE_QUOTE,
    chainId: CHAIN_IDS.MAINNET,
  };

  it("should include approve call", () => {
    const result = prepareSwapCalls(baseParams);

    expect(result.approveCall.entrypoint).toBe("approve");
    expect(
      addressesEqual(result.approveCall.contractAddress, TEST_ADDRESSES.ETH)
    ).toBe(true);
    expect(result.allCalls[0]?.entrypoint).toBe("approve");
    expect(result.allCalls).toHaveLength(5);
  });

  it("should approve router address", () => {
    const result = prepareSwapCalls(baseParams);

    expect(result.approveCall.calldata[0]).toBe(
      ROUTER_ADDRESSES[CHAIN_IDS.MAINNET]
    );
  });
});
