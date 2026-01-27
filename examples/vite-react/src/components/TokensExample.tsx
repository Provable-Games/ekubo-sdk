import { useState } from 'react'
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
        The SDK includes a built-in token registry for mainnet tokens. You can
        resolve tokens by symbol or address.
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
{`import {
  MAINNET_TOKENS,
  resolveToken,
  resolveTokenInfo,
  canResolveToken,
  createTokenRegistry,
} from 'ekubo-sdk'

// List all built-in mainnet tokens
console.log(MAINNET_TOKENS)
// [{ symbol: 'ETH', address: '0x049d36...', decimals: 18 }, ...]

// Resolve symbol to address (returns string)
const ethAddress = resolveToken('ETH')
console.log(ethAddress) // '0x049d36...'

// Get full token info (returns TokenInfo | undefined)
const eth = resolveTokenInfo('ETH')
console.log(eth?.address) // '0x049d36...'
console.log(eth?.decimals) // 18

// Resolve by address to get token info
const token = resolveTokenInfo('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')
console.log(token?.symbol) // 'ETH'

// Check if token exists
if (canResolveToken('MYTOKEN')) {
  // Token is in registry
}

// Create custom registry with additional tokens
const customRegistry = createTokenRegistry([
  ...MAINNET_TOKENS,
  { symbol: 'MYTOKEN', address: '0x...', decimals: 18 },
])

const myToken = resolveTokenInfo('MYTOKEN', customRegistry)`}
        </pre>
      </div>
    </div>
  )
}
