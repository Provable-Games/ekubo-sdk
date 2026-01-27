import { useState, useMemo } from 'react'
import { useEkuboSwap } from 'ekubo-sdk/react'
import { MAINNET_TOKENS } from 'ekubo-sdk'

export function QuoteExample() {
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('0.1')

  // Convert amount to wei (assuming 18 decimals for simplicity)
  const amountWei = useMemo(() => {
    try {
      return BigInt(Math.floor(parseFloat(amount) * 1e18))
    } catch {
      return 0n
    }
  }, [amount])

  // Use the swap hook with polling disabled - we'll refetch manually
  const { state, refetch } = useEkuboSwap({
    sellToken: tokenFrom,
    buyToken: tokenTo,
    amount: amountWei,
    enabled: false, // Don't auto-poll, we'll fetch manually
  })

  const handleGetQuote = () => {
    refetch()
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
        Fetch a quote for swapping tokens using the <code>useEkuboSwap</code> hook.
        The SDK handles token resolution by symbol or address.
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
        <button onClick={handleGetQuote} disabled={state.loading}>
          {state.loading ? 'Getting Quote...' : 'Get Quote'}
        </button>
      </div>

      {state.error && <p className="error">{state.error.message}</p>}
      {state.insufficientLiquidity && <p className="error">Insufficient liquidity for this swap</p>}

      {state.quote && (
        <div className="quote-result">
          <h3>Quote Result</h3>
          <p>
            <strong>Amount Out:</strong> {formatAmount(state.quote.total)} {tokenTo}
          </p>
          <p>
            <strong>Price Impact:</strong> {(state.quote.impact * 100).toFixed(4)}%
          </p>
          <p>
            <strong>Route Splits:</strong> {state.quote.splits.length}
          </p>

          <details>
            <summary>Raw Quote Data</summary>
            <pre>
              {JSON.stringify(
                state.quote,
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
{`import { useEkuboSwap } from 'ekubo-sdk/react'

function QuoteComponent() {
  const { state, refetch } = useEkuboSwap({
    sellToken: 'ETH',
    buyToken: 'USDC',
    amount: BigInt(1e17), // 0.1 ETH in wei
    enabled: false, // Manual fetch only
  })

  return (
    <div>
      <button onClick={refetch} disabled={state.loading}>
        Get Quote
      </button>

      {state.quote && (
        <div>
          <p>Amount out: {state.quote.total}</p>
          <p>Price impact: {state.quote.impact}</p>
        </div>
      )}
    </div>
  )
}`}
        </pre>
      </div>
    </div>
  )
}
