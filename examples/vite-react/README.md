# Ekubo SDK - Vite React Example

This example demonstrates how to use the Ekubo SDK in a React application for:

- Fetching swap quotes
- Generating and executing swap transactions
- Real-time quote polling
- Token resolution and registry

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# From the examples/vite-react directory
pnpm install

# Or if using npm
npm install
```

### Development

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Examples Included

### 1. Get Quote

Demonstrates fetching a swap quote using the `ekubo.getQuote()` method:

```typescript
import { createEkuboClient } from 'ekubo-sdk'

const ekubo = createEkuboClient({ chain: 'mainnet' })

const quote = await ekubo.getQuote({
  amount: BigInt(1e17), // 0.1 ETH in wei
  tokenFrom: 'ETH',
  tokenTo: 'USDC',
})

console.log('Amount out:', quote.total)
console.log('Price impact:', quote.impact)
```

### 2. Execute Swap

Shows the full flow of getting a quote, generating swap calls, and executing with a wallet:

```typescript
// 1. Get quote
const quote = await ekubo.getQuote({
  amount: BigInt(1e16),
  tokenFrom: 'ETH',
  tokenTo: 'USDC',
})

// 2. Calculate minimum with slippage
const minimumReceived = quote.total - (quote.total * 50n) / 10000n // 0.5%

// 3. Generate calls
const calls = ekubo.generateSwapCalls({
  sellToken: 'ETH',
  buyToken: 'USDC',
  quote,
  minimumReceived,
})

// 4. Execute with wallet
await wallet.request({
  type: 'wallet_addInvokeTransaction',
  params: {
    calls: calls.allCalls.map(c => ({
      contract_address: c.contractAddress,
      entry_point: c.entrypoint,
      calldata: c.calldata,
    })),
  },
})
```

### 3. Live Polling

Uses `createQuotePoller` for real-time quote updates:

```typescript
import { createQuotePoller } from 'ekubo-sdk'

const poller = createQuotePoller(
  {
    amount: BigInt(1e18),
    tokenFrom: ETH_ADDRESS,
    tokenTo: USDC_ADDRESS,
  },
  {
    onQuote: (quote) => {
      // Update UI with fresh quote
    },
    onError: (error) => console.error(error),
  },
  { interval: 3000 }
)

poller.start()
// Later: poller.stop()
```

### 4. Token Registry

Shows how to work with the built-in token registry:

```typescript
import {
  MAINNET_TOKENS,
  resolveToken,
  canResolveToken,
} from 'ekubo-sdk'

// Resolve by symbol
const eth = resolveToken('ETH')

// Resolve by address
const token = resolveToken('0x049d36...')

// Check availability
if (canResolveToken('MYTOKEN')) {
  // Token exists
}
```

## Project Structure

```
src/
├── App.tsx              # Main app with tab navigation
├── main.tsx             # Entry point
├── index.css            # Styles
├── components/
│   ├── QuoteExample.tsx    # Quote fetching demo
│   ├── SwapExample.tsx     # Full swap flow demo
│   ├── PollingExample.tsx  # Real-time polling demo
│   └── TokensExample.tsx   # Token registry demo
└── hooks/
    ├── useEkubo.ts      # Ekubo client hook
    └── useWallet.tsx    # Wallet connection hook
```

## Wallet Integration

This example uses [starknetkit](https://github.com/apibara/starknetkit) for wallet connection. Supported wallets include:

- Argent X
- Braavos
- Other Starknet wallets

## Building for Production

```bash
pnpm build
# or
npm run build
```

The built files will be in the `dist/` directory.
