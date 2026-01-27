import { useState } from 'react'
import { useEkuboTokens } from 'ekubo-sdk/react'
import {
  MAINNET_TOKENS,
  resolveTokenInfo,
  canResolveToken,
  type TokenInfo,
} from 'ekubo-sdk'

export function TokensExample() {
  const [searchInput, setSearchInput] = useState('')
  const [resolvedToken, setResolvedToken] = useState<TokenInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch tokens from the API using the hook
  const { tokens: apiTokens, isLoading, error: fetchError, refetch } = useEkuboTokens()

  const handleResolve = () => {
    setError(null)
    setResolvedToken(null)

    if (!searchInput.trim()) {
      setError('Please enter a token symbol or address')
      return
    }

    const token = resolveTokenInfo(searchInput.trim())
    if (token) {
      setResolvedToken(token)
    } else {
      setError(`Token "${searchInput}" not found in registry`)
    }
  }

  const handleTokenClick = (symbol: string) => {
    setSearchInput(symbol)
    const token = resolveTokenInfo(symbol)
    if (token) {
      setResolvedToken(token)
      setError(null)
    }
  }

  return (
    <div className="card">
      <h2>Token Registry</h2>
      <p>
        The SDK includes a built-in token registry and the <code>useEkuboTokens</code> hook
        for fetching tokens from the API.
      </p>

      <h3>Built-in Tokens</h3>
      <div className="token-list">
        {MAINNET_TOKENS.map((token) => (
          <button
            key={token.address}
            className="token-chip"
            onClick={() => handleTokenClick(token.symbol)}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            {token.symbol}
          </button>
        ))}
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>
        API Tokens ({isLoading ? 'loading...' : apiTokens.length})
        <button
          onClick={refetch}
          style={{ marginLeft: '1rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
          disabled={isLoading}
        >
          Refresh
        </button>
      </h3>
      {fetchError && <p className="error">{fetchError.message}</p>}
      {!isLoading && apiTokens.length > 0 && (
        <div className="token-list">
          {apiTokens.slice(0, 20).map((token) => (
            <button
              key={token.address}
              className="token-chip"
              onClick={() => handleTokenClick(token.symbol)}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {token.symbol}
            </button>
          ))}
          {apiTokens.length > 20 && (
            <span style={{ color: '#888', alignSelf: 'center' }}>
              +{apiTokens.length - 20} more
            </span>
          )}
        </div>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Resolve Token</h3>
      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label htmlFor="tokenSearch">Symbol or Address</label>
          <input
            id="tokenSearch"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ETH or 0x049d36..."
            onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
          />
        </div>
        <div className="form-group" style={{ alignSelf: 'flex-end' }}>
          <button onClick={handleResolve}>Resolve</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {resolvedToken && (
        <div className="quote-result">
          <h3>Token Info</h3>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.5rem', color: '#888' }}>Symbol</td>
                <td style={{ padding: '0.5rem' }}>{resolvedToken.symbol}</td>
              </tr>
              {resolvedToken.name && (
                <tr>
                  <td style={{ padding: '0.5rem', color: '#888' }}>Name</td>
                  <td style={{ padding: '0.5rem' }}>{resolvedToken.name}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '0.5rem', color: '#888' }}>Address</td>
                <td style={{ padding: '0.5rem' }}>
                  <code style={{ wordBreak: 'break-all' }}>
                    {resolvedToken.address}
                  </code>
                </td>
              </tr>
              {resolvedToken.decimals !== undefined && (
                <tr>
                  <td style={{ padding: '0.5rem', color: '#888' }}>Decimals</td>
                  <td style={{ padding: '0.5rem' }}>{resolvedToken.decimals}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Check Token Availability</h3>
      <div className="stats-grid">
        {['ETH', 'STRK', 'USDC', 'WBTC', 'UNKNOWN'].map((symbol) => (
          <div key={symbol} className="stat-item">
            <div
              className="stat-value"
              style={{ color: canResolveToken(symbol) ? '#69db7c' : '#ff6b6b' }}
            >
              {canResolveToken(symbol) ? '✓' : '✗'}
            </div>
            <div className="stat-label">{symbol}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h3>Code Example</h3>
        <pre style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
{`import { useEkuboTokens } from 'ekubo-sdk/react'
import { resolveTokenInfo, canResolveToken } from 'ekubo-sdk'

function TokenList() {
  // Fetch all tokens from the API
  const { tokens, isLoading, getTokenBySymbol } = useEkuboTokens()

  if (isLoading) return <p>Loading tokens...</p>

  // Get a specific token by symbol
  const eth = getTokenBySymbol('ETH')
  console.log(eth?.address) // '0x049d36...'

  return (
    <ul>
      {tokens.map(token => (
        <li key={token.address}>
          {token.symbol}: {token.name}
        </li>
      ))}
    </ul>
  )
}

// You can also use the static registry functions
const ethInfo = resolveTokenInfo('ETH')
console.log(ethInfo?.decimals) // 18

if (canResolveToken('MYTOKEN')) {
  // Token exists in registry
}`}
        </pre>
      </div>
    </div>
  )
}
