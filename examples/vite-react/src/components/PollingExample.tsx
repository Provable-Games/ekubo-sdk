import { useState, useEffect, useMemo, useRef } from 'react'
import { useEkuboSwap } from 'ekubo-sdk/react'
import { MAINNET_TOKENS, type SwapQuote } from 'ekubo-sdk'

interface QuoteUpdate {
  quote: SwapQuote
  timestamp: Date
}

export function PollingExample() {
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('1')
  const [interval, setInterval] = useState('3000')
  const [isPolling, setIsPolling] = useState(false)
  const [quotes, setQuotes] = useState<QuoteUpdate[]>([])

  // Convert amount to wei
  const amountWei = useMemo(() => {
    try {
      return BigInt(Math.floor(parseFloat(amount) * 1e18))
    } catch {
      return 0n
    }
  }, [amount])

  // Convert interval to number
  const pollingInterval = useMemo(() => {
    try {
      return parseInt(interval)
    } catch {
      return 3000
    }
  }, [interval])

  // Use the swap hook with configurable polling
  const { state } = useEkuboSwap({
    sellToken: tokenFrom,
    buyToken: tokenTo,
    amount: amountWei,
    enabled: isPolling && amountWei > 0n && tokenFrom !== tokenTo,
    pollingInterval,
  })

  // Track quote changes
  const prevQuoteRef = useRef<SwapQuote | null>(null)

  useEffect(() => {
    if (state.quote && state.quote !== prevQuoteRef.current) {
      prevQuoteRef.current = state.quote
      setQuotes((prev) => [
        { quote: state.quote!, timestamp: new Date() },
        ...prev.slice(0, 9), // Keep last 10 quotes
      ])
    }
  }, [state.quote])

  // Clear quotes when params change
  useEffect(() => {
    setQuotes([])
    prevQuoteRef.current = null
  }, [tokenFrom, tokenTo, amount, interval])

  const formatAmount = (value: bigint, decimals: number = 18) => {
    const divisor = BigInt(10 ** decimals)
    const intPart = value / divisor
    const fracPart = value % divisor
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6)
    return `${intPart}.${fracStr}`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="card">
      <h2>Live Quote Polling</h2>
      <p>
        The <code>useEkuboSwap</code> hook automatically polls for quote updates
        at a configurable interval. No need for manual poller setup!
      </p>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="pollTokenFrom">From Token</label>
          <select
            id="pollTokenFrom"
            value={tokenFrom}
            onChange={(e) => setTokenFrom(e.target.value)}
            disabled={isPolling}
          >
            {MAINNET_TOKENS.map((token) => (
              <option key={token.address} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="pollTokenTo">To Token</label>
          <select
            id="pollTokenTo"
            value={tokenTo}
            onChange={(e) => setTokenTo(e.target.value)}
            disabled={isPolling}
          >
            {MAINNET_TOKENS.map((token) => (
              <option key={token.address} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="pollAmount">Amount</label>
          <input
            id="pollAmount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1"
            disabled={isPolling}
          />
        </div>

        <div className="form-group">
          <label htmlFor="pollInterval">Interval (ms)</label>
          <input
            id="pollInterval"
            type="text"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="3000"
            disabled={isPolling}
          />
        </div>
      </div>

      <div className="button-group">
        {!isPolling ? (
          <button onClick={() => setIsPolling(true)}>Start Polling</button>
        ) : (
          <button onClick={() => setIsPolling(false)}>Stop Polling</button>
        )}
      </div>

      {state.error && <p className="error">{state.error.message}</p>}
      {state.insufficientLiquidity && <p className="error">Insufficient liquidity</p>}

      {isPolling && (
        <p className="success" style={{ marginTop: '1rem' }}>
          Polling active - refreshing every {interval}ms
          {state.loading && ' (fetching...)'}
        </p>
      )}

      {quotes.length > 0 && (
        <div className="quote-result" style={{ marginTop: '1rem' }}>
          <h3>Quote History (last 10)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Time</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>
                  Amount Out
                </th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>
                  Impact
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid #333',
                    opacity: i === 0 ? 1 : 0.7,
                  }}
                >
                  <td style={{ padding: '0.5rem' }}>
                    {formatTime(q.timestamp)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                    {formatAmount(q.quote.total)} {tokenTo}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                    {(q.quote.impact * 100).toFixed(4)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h3>Code Example</h3>
        <pre style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
{`import { useEkuboSwap } from 'ekubo-sdk/react'

function LiveQuote() {
  const [isPolling, setIsPolling] = useState(true)

  const { state } = useEkuboSwap({
    sellToken: 'ETH',
    buyToken: 'USDC',
    amount: BigInt(1e18), // 1 ETH
    enabled: isPolling,
    pollingInterval: 3000, // Refresh every 3 seconds
  })

  return (
    <div>
      <button onClick={() => setIsPolling(!isPolling)}>
        {isPolling ? 'Stop' : 'Start'} Polling
      </button>

      {state.loading && <p>Refreshing...</p>}

      {state.quote && (
        <p>
          Current quote: {state.quote.total} USDC
          (impact: {state.quote.impact}%)
        </p>
      )}

      {state.error && <p>Error: {state.error.message}</p>}
    </div>
  )
}`}
        </pre>
      </div>
    </div>
  )
}
