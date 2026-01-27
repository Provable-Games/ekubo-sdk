import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { connect, type StarknetWindowObject } from 'starknetkit'

interface WalletContextType {
  address: string | null
  wallet: StarknetWindowObject | null
  isConnecting: boolean
  error: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [wallet, setWallet] = useState<StarknetWindowObject | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const result = await connect({
        modalMode: 'alwaysAsk',
        modalTheme: 'dark',
      })

      if (result && result.wallet) {
        setWallet(result.wallet)
        const accounts = await result.wallet.request({
          type: 'wallet_requestAccounts',
        })
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setWallet(null)
    setAddress(null)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        address,
        wallet,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
