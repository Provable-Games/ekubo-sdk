import type { TokenInfo } from "../types/token.js";

/**
 * Well-known mainnet tokens
 */
export const MAINNET_TOKENS: TokenInfo[] = [
  {
    symbol: "ETH",
    name: "Ether",
    address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    decimals: 18,
  },
  {
    symbol: "STRK",
    name: "Starknet Token",
    address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb",
    decimals: 6,
  },
  {
    symbol: "USDC.e",
    name: "Bridged USDC",
    address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
    decimals: 6,
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3",
    decimals: 18,
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
    decimals: 8,
  },
  {
    symbol: "LORDS",
    name: "Lords Token",
    address: "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
    decimals: 18,
  },
  {
    symbol: "wstETH",
    name: "Wrapped stETH",
    address: "0x042b8f0484674ca266ac5d08e4ac6a3fe65bd3129795def2dca5c34ecc5f96d2",
    decimals: 18,
  },
  {
    symbol: "EKUBO",
    name: "Ekubo Protocol",
    address: "0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87",
    decimals: 18,
  },
  {
    symbol: "ZEND",
    name: "zkLend",
    address: "0x00585c32b625999e6e5e78645ff8df7a9001cf5cf3eb6b80ccdd16cb64bd3a34",
    decimals: 18,
  },
  {
    symbol: "NSTR",
    name: "Nostra",
    address: "0x04619e9ce4109590219c5263787050726be63382148538f3f936c22aa87d2fc2",
    decimals: 18,
  },
];

/**
 * Get mainnet tokens as a map by symbol (uppercase)
 */
export function getMainnetTokensMap(): Map<string, TokenInfo> {
  const map = new Map<string, TokenInfo>();
  for (const token of MAINNET_TOKENS) {
    map.set(token.symbol.toUpperCase(), token);
  }
  return map;
}
