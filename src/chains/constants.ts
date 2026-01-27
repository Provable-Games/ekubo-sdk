/**
 * Ekubo chain IDs (decimal string format used by API)
 */
export const CHAIN_IDS = {
  MAINNET: "23448594291968334",
  SEPOLIA: "393402133025997798000961",
} as const;

/**
 * Starknet.js chain ID constants (hex format)
 */
export const STARKNET_CHAIN_IDS = {
  SN_MAIN: "0x534e5f4d41494e",
  SN_SEPOLIA: "0x534e5f5345504f4c4941",
} as const;

/**
 * Ekubo Router contract addresses by chain
 */
export const ROUTER_ADDRESSES = {
  [CHAIN_IDS.MAINNET]:
    "0x0199741822c2dc722f6f605204f35e56dbc23bceed54818168c4c49e4fb8737e",
  [CHAIN_IDS.SEPOLIA]:
    "0x0045f933adf0607292468ad1c1dedaa74d5ad166392590e72676a34d01d7b763",
} as const;

/**
 * USDC contract addresses by chain (for price quotes)
 */
export const USDC_ADDRESSES = {
  [CHAIN_IDS.MAINNET]:
    "0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb",
  [CHAIN_IDS.SEPOLIA]:
    "0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080",
} as const;

/**
 * API base URLs
 */
export const API_URLS = {
  /** Quoter API for swap quotes */
  QUOTER: "https://prod-api-quoter.ekubo.org",
  /** Main API for tokens, prices, stats, etc. */
  API: "https://prod-api.ekubo.org",
} as const;

/**
 * Chain configuration preset
 */
export interface ChainConfig {
  chainId: string;
  quoterApiUrl: string;
  apiUrl: string;
  routerAddress: string;
  usdcAddress: string;
}

/**
 * Pre-configured chain configurations
 */
export const CHAIN_CONFIGS: Record<"mainnet" | "sepolia", ChainConfig> = {
  mainnet: {
    chainId: CHAIN_IDS.MAINNET,
    quoterApiUrl: API_URLS.QUOTER,
    apiUrl: API_URLS.API,
    routerAddress: ROUTER_ADDRESSES[CHAIN_IDS.MAINNET],
    usdcAddress: USDC_ADDRESSES[CHAIN_IDS.MAINNET],
  },
  sepolia: {
    chainId: CHAIN_IDS.SEPOLIA,
    quoterApiUrl: API_URLS.QUOTER,
    apiUrl: API_URLS.API,
    routerAddress: ROUTER_ADDRESSES[CHAIN_IDS.SEPOLIA],
    usdcAddress: USDC_ADDRESSES[CHAIN_IDS.SEPOLIA],
  },
};

/**
 * Map starknet.js chain IDs to Ekubo chain IDs
 */
export const STARKNET_TO_EKUBO_CHAIN: Record<string, string> = {
  [STARKNET_CHAIN_IDS.SN_MAIN]: CHAIN_IDS.MAINNET,
  [STARKNET_CHAIN_IDS.SN_SEPOLIA]: CHAIN_IDS.SEPOLIA,
};

/**
 * Get Ekubo chain ID from starknet.js chain ID
 */
export function getEkuboChainId(starknetChainId: string): string | undefined {
  return STARKNET_TO_EKUBO_CHAIN[starknetChainId];
}

/**
 * Get chain config by chain name or ID
 */
export function getChainConfig(
  chainOrId: "mainnet" | "sepolia" | string
): ChainConfig | undefined {
  if (chainOrId === "mainnet" || chainOrId === "sepolia") {
    return CHAIN_CONFIGS[chainOrId];
  }

  // Try to find by chain ID
  if (chainOrId === CHAIN_IDS.MAINNET) {
    return CHAIN_CONFIGS.mainnet;
  }
  if (chainOrId === CHAIN_IDS.SEPOLIA) {
    return CHAIN_CONFIGS.sepolia;
  }

  // Try starknet.js chain ID format
  const ekuboChainId = getEkuboChainId(chainOrId);
  if (ekuboChainId === CHAIN_IDS.MAINNET) {
    return CHAIN_CONFIGS.mainnet;
  }
  if (ekuboChainId === CHAIN_IDS.SEPOLIA) {
    return CHAIN_CONFIGS.sepolia;
  }

  return undefined;
}
