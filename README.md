# Ekubo SDK

A standalone TypeScript SDK for Ekubo DEX routing and quotes on Starknet.

## Features

- **Quote fetching** with retry logic, timeout, and abort support
- **Symbol or address input** - Accept "ETH" or "0x049d36..." interchangeably
- **Configurable polling** for real-time quote updates
- **Swap call generation** for `multihop_swap` and `multi_multihop_swap`
- **Dynamic token list** - Fetch tokens from API or use built-in registry
- **Protocol statistics** - TVL, volume, top pairs
- **Multi-chain support** - Mainnet and Sepolia
- **Tree-shakeable** - Import only what you need

## Installation

```bash
npm install ekubo-sdk
# or
pnpm add ekubo-sdk
```

## Quick Start

### Using EkuboClient (Recommended)

```typescript
import { createEkuboClient } from 'ekubo-sdk';

const client = createEkuboClient({ chain: 'mainnet' });

// Fetch a quote using symbols
const quote = await client.getQuote({
  amount: 1000000000000000000n, // 1 ETH
  tokenFrom: 'ETH',
  tokenTo: 'STRK',
});

console.log('Expected STRK:', quote.total);
console.log('Price impact:', quote.impact);

// Generate swap calls
const { allCalls } = client.generateSwapCalls({
  sellToken: 'ETH',
  buyToken: 'STRK',
  minimumReceived: quote.total * 99n / 100n, // 1% slippage
  quote,
});

// Execute with starknet.js or your wallet
await account.execute(allCalls);
```

### Direct Function Imports (Tree-Shakeable)

```typescript
import {
  fetchSwapQuote,
  generateSwapCalls,
  CHAIN_IDS
} from 'ekubo-sdk';

// Fetch quote
const quote = await fetchSwapQuote({
  amount: 1000000000000000000n,
  tokenFrom: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  tokenTo: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  chainId: CHAIN_IDS.MAINNET,
});

// Generate calls
const { allCalls } = generateSwapCalls({
  sellToken: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  buyToken: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  minimumReceived: quote.total * 99n / 100n,
  quote,
  chainId: CHAIN_IDS.MAINNET,
});
```

## Quote Polling

For real-time quote updates:

```typescript
const client = createEkuboClient({ chain: 'mainnet' });

const poller = client.createQuotePoller(
  { amount: 1n * 10n ** 18n, tokenFrom: 'ETH', tokenTo: 'STRK' },
  {
    onQuote: (quote) => {
      console.log('New quote:', quote.total);
    },
    onError: (err) => {
      console.error('Quote error:', err);
    },
    onStop: (reason) => {
      console.log('Polling stopped:', reason);
    },
  },
  { interval: 5000 } // Poll every 5 seconds
);

poller.start();

// Later...
poller.stop();
```

## Token Management

### Static Registry (Built-in)

```typescript
import { resolveToken, MAINNET_TOKENS, TokenRegistry } from 'ekubo-sdk';

// Resolve symbol to address
const ethAddress = resolveToken('ETH');
const strkAddress = resolveToken('strk'); // case-insensitive

// Use custom tokens
const registry = new TokenRegistry([
  { symbol: 'MYTOKEN', address: '0x123...', decimals: 18 }
]);

const address = resolveToken('MYTOKEN', registry);
```

### Dynamic Token List (From API)

```typescript
const client = createEkuboClient({ chain: 'mainnet' });

// Fetch all tokens from Ekubo API
const tokens = await client.fetchTokens();
console.log(`Found ${tokens.length} tokens`);

// Fetch specific token metadata
const ethInfo = await client.fetchToken('ETH');
console.log(ethInfo?.name, ethInfo?.decimals);

// Sync API tokens to local registry for symbol resolution
await client.syncTokensFromApi();

// Now you can use any token symbol from the API
const quote = await client.getQuote({
  amount: 1n * 10n ** 18n,
  tokenFrom: 'SOME_NEW_TOKEN',
  tokenTo: 'USDC',
});
```

### Built-in Tokens

ETH, STRK, USDC, USDC.e, USDT, DAI, WBTC, LORDS, wstETH, EKUBO, ZEND, NSTR

## Protocol Statistics

```typescript
const client = createEkuboClient({ chain: 'mainnet' });

// Protocol-wide stats
const tvl = await client.getTvl();
console.log('Total TVL:', tvl.tvl_usd);

const volume = await client.getVolume();
console.log('24h Volume:', volume.volume_24h_usd);

// Top trading pairs
const pairs = await client.getTopPairs();
for (const pair of pairs.slice(0, 5)) {
  console.log(`${pair.token0}/${pair.token1}: $${pair.volume_24h_usd}`);
}

// Pair-specific stats
const ethStrkTvl = await client.getPairTvl('ETH', 'STRK');
const ethStrkVolume = await client.getPairVolume('ETH', 'STRK');
const ethStrkPools = await client.getPairPools('ETH', 'STRK');
```

## Configuration

```typescript
const client = createEkuboClient({
  // Chain selection
  chain: 'mainnet', // or 'sepolia'

  // Or use custom chain ID
  chainId: '23448594291968334',

  // Custom API URLs
  quoterApiUrl: 'https://prod-api-quoter.ekubo.org',
  apiUrl: 'https://prod-api.ekubo.org',

  // Custom router address
  routerAddress: '0x...',

  // Default slippage (5%)
  defaultSlippagePercent: 5n,

  // Fetch configuration
  fetch: {
    timeout: 10000,
    maxRetries: 3,
    baseBackoff: 1000,
    maxBackoff: 5000,
  },

  // Polling configuration
  polling: {
    interval: 5000,
    maxConsecutiveErrors: 3,
  },

  // Custom tokens (added to built-in registry)
  customTokens: [
    { symbol: 'MYTOKEN', address: '0x...', decimals: 18 }
  ],
});
```

## Error Handling

```typescript
import {
  InsufficientLiquidityError,
  RateLimitError,
  TokenNotFoundError,
} from 'ekubo-sdk';

try {
  const quote = await client.getQuote({
    amount: 1n * 10n ** 30n, // Very large amount
    tokenFrom: 'ETH',
    tokenTo: 'STRK',
  });
} catch (error) {
  if (error instanceof InsufficientLiquidityError) {
    console.log('Not enough liquidity for this swap');
  } else if (error instanceof RateLimitError) {
    console.log('Rate limited, try again later');
  } else if (error instanceof TokenNotFoundError) {
    console.log('Unknown token symbol');
  }
}
```

## API Reference

### EkuboClient Methods

#### Swap Quotes
| Method | Description |
|--------|-------------|
| `getQuote(params)` | Fetch a swap quote |
| `getUsdcPrice(token, amount)` | Get token price in USDC |
| `getPriceHistory(token, otherToken)` | Fetch price history |

#### Swap Execution
| Method | Description |
|--------|-------------|
| `generateSwapCalls(params)` | Generate swap transaction calls |
| `prepareSwapCalls(params)` | Generate calls with ERC20 approval |

#### Polling
| Method | Description |
|--------|-------------|
| `createQuotePoller(params, callbacks)` | Create a quote polling instance |

#### Token Management
| Method | Description |
|--------|-------------|
| `resolveToken(identifier)` | Resolve symbol/address to address |
| `registerToken(token)` | Register a custom token locally |
| `fetchTokens()` | Fetch all tokens from API |
| `fetchToken(address)` | Fetch single token metadata |
| `fetchTokensBatch(addresses)` | Fetch multiple tokens |
| `syncTokensFromApi()` | Sync API tokens to local registry |

#### Protocol Statistics
| Method | Description |
|--------|-------------|
| `getTvl()` | Fetch protocol TVL |
| `getVolume()` | Fetch protocol volume |
| `getTopPairs()` | Fetch top trading pairs |
| `getPairTvl(tokenA, tokenB)` | Fetch pair TVL history |
| `getPairVolume(tokenA, tokenB)` | Fetch pair volume history |
| `getPairPools(tokenA, tokenB)` | Fetch pools for a pair |

### Standalone Functions

| Function | Description |
|----------|-------------|
| `fetchSwapQuote(params)` | Fetch quote from Ekubo API |
| `fetchSwapQuoteInUsdc(params)` | Fetch token price in USDC |
| `getPriceHistory(params)` | Fetch price history |
| `fetchTokens(params)` | Fetch all tokens |
| `fetchToken(params)` | Fetch single token |
| `fetchTokensBatch(params)` | Fetch multiple tokens |
| `fetchTopPairs(params)` | Fetch top pairs |
| `fetchTvl(params)` | Fetch protocol TVL |
| `fetchVolume(params)` | Fetch protocol volume |
| `fetchPairTvl(params)` | Fetch pair TVL |
| `fetchPairVolume(params)` | Fetch pair volume |
| `fetchPairPools(params)` | Fetch pair pools |
| `generateSwapCalls(params)` | Generate swap calls |
| `prepareSwapCalls(params)` | Generate calls with approval |
| `resolveToken(identifier, registry?)` | Resolve token identifier |

## Chain IDs

```typescript
import { CHAIN_IDS, STARKNET_CHAIN_IDS } from 'ekubo-sdk';

// Ekubo API format (decimal)
CHAIN_IDS.MAINNET  // "23448594291968334"
CHAIN_IDS.SEPOLIA  // "393402133025997798000961"

// Starknet.js format (hex)
STARKNET_CHAIN_IDS.SN_MAIN    // "0x534e5f4d41494e"
STARKNET_CHAIN_IDS.SN_SEPOLIA // "0x534e5f5345504f4c4941"
```

## API URLs

```typescript
import { API_URLS } from 'ekubo-sdk';

API_URLS.QUOTER  // "https://prod-api-quoter.ekubo.org" - Swap quotes
API_URLS.API     // "https://prod-api.ekubo.org" - Tokens, prices, stats
```

## License

MIT
