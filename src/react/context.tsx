import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { EkuboClient, createEkuboClient } from "../client.js";
import type { EkuboClientConfig } from "../types/index.js";

/**
 * Context for sharing EkuboClient instance across components
 */
const EkuboContext = createContext<EkuboClient | null>(null);

export interface EkuboProviderProps {
  children: ReactNode;
  /** Client configuration */
  config?: EkuboClientConfig;
  /** Pre-created client instance (alternative to config) */
  client?: EkuboClient;
}

/**
 * Provider component for EkuboClient
 *
 * @example
 * ```tsx
 * import { EkuboProvider } from '@provable-games/ekubo-sdk/react';
 *
 * function App() {
 *   return (
 *     <EkuboProvider config={{ chain: 'mainnet' }}>
 *       <YourApp />
 *     </EkuboProvider>
 *   );
 * }
 * ```
 */
export function EkuboProvider({
  children,
  config,
  client: providedClient,
}: EkuboProviderProps) {
  const client = useMemo(() => {
    if (providedClient) {
      return providedClient;
    }
    return createEkuboClient(config);
  }, [providedClient, config]);

  return (
    <EkuboContext.Provider value={client}>{children}</EkuboContext.Provider>
  );
}

/**
 * Hook to access the EkuboClient from context
 *
 * @throws Error if used outside of EkuboProvider
 */
export function useEkuboClient(): EkuboClient {
  const client = useContext(EkuboContext);
  if (!client) {
    throw new Error("useEkuboClient must be used within an EkuboProvider");
  }
  return client;
}

/**
 * Hook to optionally access the EkuboClient from context
 * Returns null if used outside of EkuboProvider
 */
export function useOptionalEkuboClient(): EkuboClient | null {
  return useContext(EkuboContext);
}
