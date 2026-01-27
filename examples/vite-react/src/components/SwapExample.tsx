import { useState } from 'react'
import { useEkubo } from '../hooks/useEkubo'
import { useWallet } from '../hooks/useWallet'
import { MAINNET_TOKENS, type SwapQuote, type SwapCallsResult } from 'ekubo-sdk'

export function SwapExample() {
  const ekubo = useEkubo()
  const { address, wallet, isConnecting, connectWallet } = useWallet()
  const [tokenFrom, setTokenFrom] = useState('ETH')
  const [tokenTo, setTokenTo] = useState('USDC')
  const [amount, setAmount] = useState('0.01')
  const [slippage, setSlippage] = useState('0.5')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [calls, setCalls] = useState<SwapCallsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleGetQuoteAndCalls = async () => {
    setLoading(true)
    setError(null)
    setQuote(null)
    setCalls(null)
    setTxHash(null)

    try {
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18))

      // First get the quote
      const quoteResult = await ekubo.getQuote({
        amount: amountWei,
        tokenFrom,
        tokenTo,
      })
      setQuote(quoteResult)

      // Calculate minimum received with slippage
      const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100))
      const minimumReceived =
        quoteResult.total - (quoteResult.total * slippageBps) / 10000n

      // Generate swap calls
      const swapCalls = ekubo.generateSwapCalls({
        sellToken: tokenFrom,
        buyToken: tokenTo,
        quote: quoteResult,
        minimumReceived,
      })
      setCalls(swapCalls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare swap')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteSwap = async () => {
    if (!wallet || !calls) return

    setExecuting(true)
    setError(null)
    setTxHash(null)

    try {
      // Execute the swap using the wallet
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
      setError(err instanceof Error ? err.message : 'Failed to execute swap')
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

  return (
    <div className="card">
      <h2>Execute Swap</h2>
      <p>
        Generate swap calls and execute them with a connected wallet. This
        example shows the full swap flow.
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
            placeholder="0.5"
          />
        </div>
      </div>

      <div className="button-group">
        <button onClick={handleGetQuoteAndCalls} disabled={loading}>
          {loading ? 'Preparing...' : 'Prepare Swap'}
        </button>
        {calls && address && (
          <button onClick={handleExecuteSwap} disabled={executing}>
            {executing ? 'Executing...' : 'Execute Swap'}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
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

      {quote && (
        <div className="quote-result">
          <h3>Quote</h3>
          <p>
            <strong>You receive:</strong> ~{formatAmount(quote.total)} {tokenTo}
          </p>
          <p>
            <strong>Price Impact:</strong> {(quote.impact * 100).toFixed(4)}%
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
{`import { createEkuboClient } from 'ekubo-sdk'

const ekubo = createEkuboClient({ chain: 'mainnet' })

// 1. Get a quote
const quote = await ekubo.getQuote({
  amount: BigInt(1e16), // 0.01 ETH
  tokenFrom: 'ETH',
  tokenTo: 'USDC',
})

// 2. Calculate minimum with slippage (0.5%)
const minimumReceived = quote.total - (quote.total * 50n) / 10000n

// 3. Generate swap calls
const calls = ekubo.generateSwapCalls({
  sellToken: 'ETH',
  buyToken: 'USDC',
  quote,
  minimumReceived,
})

// 4. Execute with wallet (e.g., starknetkit)
await wallet.request({
  type: 'wallet_addInvokeTransaction',
  params: {
    calls: calls.allCalls.map(c => ({
      contract_address: c.contractAddress,
      entry_point: c.entrypoint,
      calldata: c.calldata,
    })),
  },
})`}
        </pre>
      </div>
    </div>
  )
}
