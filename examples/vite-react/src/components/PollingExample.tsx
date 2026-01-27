import { useState, useEffect, useRef, useCallback } from 'react'
import { useEkubo } from '../hooks/useEkubo'
import { MAINNET_TOKENS, createQuotePoller, type SwapQuote } from 'ekubo-sdk'

interface QuoteUpdate {
  quote: SwapQuote
  timestamp: Date
}

export function PollingExample() {
  const ekubo = useEkubo()
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('1')
  const [interval, setInterval] = useState('3000')
  const [isPolling, setIsPolling] = useState(false)
  const [quotes, setQuotes] = useState<QuoteUpdate[]>([])
  const [error, setError] = useState<string | null>(null)

  const pollerRef = useRef<ReturnType<typeof createQuotePoller> | null>(null)

  const startPolling = useCallback(() => {
    setError(null)
    setQuotes([])

    try {
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18))
      const sellTokenAddress = ekubo.resolveToken(tokenFrom)
      const buyTokenAddress = ekubo.resolveToken(tokenTo)

      pollerRef.current = createQuotePoller(
        {
          amount: amountWei,
          tokenFrom: sellTokenAddress,
          tokenTo: buyTokenAddress,
        },
        {
          onQuote: (quote) => {
            setQuotes((prev) => [
              { quote, timestamp: new Date() },
              ...prev.slice(0, 9), // Keep last 10 quotes
            ])
          },
          onError: (err) => {
            setError(err.message)
          },
          onStop: (reason) => {
            if (reason === 'errors') {
              setError('Polling stopped due to consecutive errors')
            }
            setIsPolling(false)
          },
        },
        {
          interval: parseInt(interval),
          maxConsecutiveErrors: 5,
        }
      )

      pollerRef.current.start()
      setIsPolling(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start polling')
    }
  }, [ekubo, tokenFrom, tokenTo, amount, interval])

  const stopPolling = useCallback(() => {
    pollerRef.current?.stop()
    pollerRef.current = null
    setIsPolling(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollerRef.current?.stop()
    }
  }, [])

  // Stop polling when params change
  useEffect(() => {
    if (isPolling) {
      stopPolling()
    }
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
        Use the QuotePoller to get real-time quote updates. Useful for live swap
        interfaces that need to keep quotes fresh.
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
          <button onClick={startPolling}>Start Polling</button>
        ) : (
          <button onClick={stopPolling}>Stop Polling</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {isPolling && (
        <p className="success" style={{ marginTop: '1rem' }}>
          Polling active - refreshing every {interval}ms
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
{`import { createQuotePoller } from 'ekubo-sdk'

const poller = createQuotePoller(
  {
    amount: BigInt(1e18), // 1 ETH
    tokenFrom: '0x049d36...', // ETH address
    tokenTo: '0x053c91...', // USDC address
  },
  {
    onQuote: (quote) => {
      console.log('New quote:', quote.total)
      // Update your UI with the fresh quote
    },
    onError: (error) => {
      console.error('Quote error:', error)
    },
    onStop: (reason) => {
      console.log('Polling stopped:', reason)
    },
  },
  {
    interval: 3000, // Poll every 3 seconds
    maxConsecutiveErrors: 5,
  }
)

// Start polling
poller.start()

// Later, stop polling
poller.stop()`}
        </pre>
      </div>
    </div>
  )
}
