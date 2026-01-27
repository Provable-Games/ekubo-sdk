import { useState, useMemo } from 'react'
import { useEkuboSwap } from 'ekubo-sdk/react'
import { useWallet } from '../hooks/useWallet'
import { MAINNET_TOKENS } from 'ekubo-sdk'

export function SwapExample() {
  const { address, wallet, isConnecting, connectWallet } = useWallet()
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('0.01')
  const [slippage, setSlippage] = useState('5')
  const [executing, setExecuting] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [executeError, setExecuteError] = useState<string | null>(null)

  // Convert amount to wei
  const amountWei = useMemo(() => {
    try {
      return BigInt(Math.floor(parseFloat(amount) * 1e18))
    } catch {
      return 0n
    }
  }, [amount])

  // Convert slippage to bigint
  const slippagePercent = useMemo(() => {
    try {
      return BigInt(Math.floor(parseFloat(slippage)))
    } catch {
      return 5n
    }
  }, [slippage])

  // Use the swap hook - it automatically polls for quotes
  const { state, generateCalls } = useEkuboSwap({
    sellToken: tokenFrom,
    buyToken: tokenTo,
    amount: amountWei,
    enabled: amountWei > 0n && tokenFrom !== tokenTo,
    pollingInterval: 5000,
    defaultSlippagePercent: slippagePercent,
  })

  const handleExecuteSwap = async () => {
    if (!wallet) return

    const calls = generateCalls(slippagePercent)
    if (!calls) {
      setExecuteError('Failed to generate swap calls')
      return
    }

    setExecuting(true)
    setExecuteError(null)
    setTxHash(null)

    try {
      const result = await wallet.request({
        type: 'wallet_addInvokeTransaction',
        params: {
          calls: calls.allCalls.map((call) => ({
            contract_address: call.contractAddress,
            entry_point: call.entrypoint,
            calldata: call.calldata,
          })),
        },
      })

      setTxHash(result.transaction_hash)
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : 'Failed to execute swap')
    } finally {
      setExecuting(false)
    }
  }

  const formatAmount = (value: bigint, decimals: number = 18) => {
    const divisor = BigInt(10 ** decimals)
    const intPart = value / divisor
    const fracPart = value % divisor
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6)
    return `${intPart}.${fracStr}`
  }

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const calls = state.quote ? generateCalls(slippagePercent) : null

  return (
    <div className="card">
      <h2>Execute Swap</h2>
      <p>
        Use <code>useEkuboSwap</code> with automatic polling and execute swaps
        with a connected wallet.
      </p>

      <div className="wallet-section">
        {address ? (
          <>
            <span className="success">Connected:</span>
            <span className="wallet-address">{shortenAddress(address)}</span>
          </>
        ) : (
          <button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="swapTokenFrom">From Token</label>
          <select
            id="swapTokenFrom"
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
          <label htmlFor="swapTokenTo">To Token</label>
          <select
            id="swapTokenTo"
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
          <label htmlFor="swapAmount">Amount</label>
          <input
            id="swapAmount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slippage">Slippage %</label>
          <input
            id="slippage"
            type="text"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            placeholder="5"
          />
        </div>
      </div>

      <div className="button-group">
        {state.loading && <span style={{ color: '#888' }}>Fetching quote...</span>}
        {state.quote && address && (
          <button onClick={handleExecuteSwap} disabled={executing || !calls}>
            {executing ? 'Executing...' : 'Execute Swap'}
          </button>
        )}
      </div>

      {state.error && <p className="error">{state.error.message}</p>}
      {state.insufficientLiquidity && <p className="error">Insufficient liquidity</p>}
      {executeError && <p className="error">{executeError}</p>}
      {txHash && (
        <p className="success">
          Transaction submitted:{' '}
          <a
            href={`https://starkscan.co/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#69db7c' }}
          >
            {shortenAddress(txHash)}
          </a>
        </p>
      )}

      {state.quote && (
        <div className="quote-result">
          <h3>Live Quote (auto-refreshing)</h3>
          <p>
            <strong>You receive:</strong> ~{formatAmount(state.quote.total)} {tokenTo}
          </p>
          <p>
            <strong>Price Impact:</strong> {(state.quote.impact * 100).toFixed(4)}%
          </p>
        </div>
      )}

      {calls && (
        <div className="swap-calls">
          <h3>Generated Calls ({calls.allCalls.length})</h3>
          {calls.allCalls.map((call, i) => (
            <div key={i} className="swap-call">
              <h4>
                {i + 1}. {call.entrypoint}
              </h4>
              <p>
                <strong>Contract:</strong>{' '}
                <code>{shortenAddress(call.contractAddress)}</code>
              </p>
              <p>
                <strong>Calldata:</strong>{' '}
                <code>[{call.calldata.length} items]</code>
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h3>Code Example</h3>
        <pre style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
{`import { useEkuboSwap } from 'ekubo-sdk/react'

function SwapComponent() {
  const { state, generateCalls } = useEkuboSwap({
    sellToken: 'ETH',
    buyToken: 'USDC',
    amount: BigInt(1e16), // 0.01 ETH
    pollingInterval: 5000, // Refresh every 5s
  })

  const handleSwap = async () => {
    // Generate calls with 5% slippage
    const calls = generateCalls(5n)
    if (!calls) return

    // Execute with wallet
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
  }

  return (
    <div>
      {state.loading && <p>Loading quote...</p>}
      {state.quote && (
        <>
          <p>You receive: {state.quote.total}</p>
          <button onClick={handleSwap}>Swap</button>
        </>
      )}
    </div>
  )
}`}
        </pre>
      </div>
    </div>
  )
}
