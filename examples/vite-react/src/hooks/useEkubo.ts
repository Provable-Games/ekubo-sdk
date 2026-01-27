import { useMemo } from 'react'
import { createEkuboClient } from 'ekubo-sdk'

export function useEkubo() {
  const client = useMemo(() => {
    return createEkuboClient({
      chain: 'mainnet',
    })
  }, [])

  return client
}
