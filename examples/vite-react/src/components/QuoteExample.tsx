import { useState } from 'react'
import { useEkubo } from '../hooks/useEkubo'
import { MAINNET_TOKENS, type SwapQuote } from 'ekubo-sdk'

export function QuoteExample() {
  const ekubo = useEkubo()
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('0.1')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetQuote = async () => {
    setLoading(true)
    setError(null)
    setQuote(null)

    try {
      // Convert amount to wei (assuming 18 decimals for simplicity)
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18))

      const result = await ekubo.getQuote({
        amount: amountWei,
        tokenFrom,
        tokenTo,
      })

      setQuote(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (value: bigint, decimals: number = 18) => {
    const divisor = BigInt(10 ** decimals)
    const intPart = value / divisor
    const fracPart = value % divisor
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6)
    return `${intPart}.${fracStr}`
  }

  return (
    <div className="card">
      <h2>Get Swap Quote</h2>
      <p>
        Fetch a quote for swapping tokens. The SDK handles token resolution by
        symbol or address.
      </p>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="tokenFrom">From Token</label>
          <select
            id="tokenFrom"
            value={tokenFrom}
            onChange={(e) => setTokenFrom(e.target.value)}
          >
            {MAINNET_TOKENS.map((token) => (
              <option key={token.address} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tokenTo">To Token</label>
          <select
            id="tokenTo"
            value={tokenTo}
            onChange={(e) => setTokenTo(e.target.value)}
          >
            {MAINNET_TOKENS.map((token) => (
              <option key={token.address} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
          />
        </div>
      </div>

      <div className="button-group">
        <button onClick={handleGetQuote} disabled={loading}>
          {loading ? 'Getting Quote...' : 'Get Quote'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {quote && (
        <div className="quote-result">
          <h3>Quote Result</h3>
          <p>
            <strong>Amount Out:</strong> {formatAmount(quote.total)} {tokenTo}
          </p>
          <p>
            <strong>Price Impact:</strong> {(quote.impact * 100).toFixed(4)}%
          </p>
          <p>
            <strong>Route Splits:</strong> {quote.splits.length}
          </p>

          <details>
            <summary>Raw Quote Data</summary>
            <pre>
              {JSON.stringify(
                quote,
                (_, v) => (typeof v === 'bigint' ? v.toString() : v),
                2
              )}
            </pre>
          </details>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h3>Code Example</h3>
        <pre style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
{`import { createEkuboClient } from 'ekubo-sdk'

const ekubo = createEkuboClient({ chain: 'mainnet' })

// Get a swap quote using token symbols
const quote = await ekubo.getQuote({
  amount: BigInt(1e17), // 0.1 ETH in wei
  tokenFrom: 'ETH',
  tokenTo: 'USDC',
})

console.log('Amount out:', quote.total)
console.log('Price impact:', quote.impact)`}
        </pre>
      </div>
    </div>
  )
}
