import { useState } from 'react'
import { QuoteExample } from './components/QuoteExample'
import { SwapExample } from './components/SwapExample'
import { TokensExample } from './components/TokensExample'
import { PollingExample } from './components/PollingExample'
import { WalletProvider } from './hooks/useWallet'

type Tab = 'quote' | 'swap' | 'tokens' | 'polling'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('quote')

  return (
    <WalletProvider>
      <div className="app">
        <h1>Ekubo SDK Examples</h1>
        <p>
          Interactive examples demonstrating how to use the Ekubo SDK for token
          quotes, swaps, and more on Starknet.
        </p>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'quote' ? 'active' : ''}`}
            onClick={() => setActiveTab('quote')}
          >
            Get Quote
          </button>
          <button
            className={`tab ${activeTab === 'swap' ? 'active' : ''}`}
            onClick={() => setActiveTab('swap')}
          >
            Swap
          </button>
          <button
            className={`tab ${activeTab === 'polling' ? 'active' : ''}`}
            onClick={() => setActiveTab('polling')}
          >
            Live Polling
          </button>
          <button
            className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            Tokens
          </button>
        </div>

        {activeTab === 'quote' && <QuoteExample />}
        {activeTab === 'swap' && <SwapExample />}
        {activeTab === 'polling' && <PollingExample />}
        {activeTab === 'tokens' && <TokensExample />}
      </div>
    </WalletProvider>
  )
}

export default App
