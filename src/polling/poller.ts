import type { SwapQuote, PollingConfig, FetchConfig } from "../types/index.js";
import { fetchSwapQuote } from "../api/quote.js";

/**
 * Default polling configuration
 */
export const DEFAULT_POLLING_CONFIG: Required<PollingConfig> = {
  interval: 5000,
  maxConsecutiveErrors: 3,
};

/**
 * Quote poller callbacks
 */
export interface QuotePollerCallbacks {
  /** Called when a new quote is received */
  onQuote: (quote: SwapQuote) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when polling stops (due to errors or manually) */
  onStop?: (reason: "manual" | "errors") => void;
}

/**
 * Parameters for quote polling
 */
export interface QuotePollerParams {
  /** Amount to swap */
  amount: bigint;
  /** Token to sell (address) */
  tokenFrom: string;
  /** Token to buy (address) */
  tokenTo: string;
  /** Chain ID (Ekubo format) */
  chainId?: string;
}

/**
 * QuotePoller class for real-time quote updates
 */
export class QuotePoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;
  private consecutiveErrors = 0;
  private isRunning = false;

  private readonly params: QuotePollerParams;
  private readonly callbacks: QuotePollerCallbacks;
  private readonly config: Required<PollingConfig>;
  private readonly fetchConfig?: FetchConfig;

  constructor(
    params: QuotePollerParams,
    callbacks: QuotePollerCallbacks,
    config: PollingConfig = {},
    fetchConfig?: FetchConfig
  ) {
    this.params = params;
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_POLLING_CONFIG, ...config };
    this.fetchConfig = fetchConfig;
  }

  /**
   * Start polling for quotes
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.consecutiveErrors = 0;
    this.abortController = new AbortController();

    // Fetch immediately
    void this.fetchQuote();

    // Set up interval
    this.intervalId = setInterval(() => {
      void this.fetchQuote();
    }, this.config.interval);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.callbacks.onStop?.("manual");
  }

  /**
   * Check if currently polling
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Update polling parameters (requires restart)
   */
  updateParams(params: Partial<QuotePollerParams>): void {
    Object.assign(this.params, params);

    // If running, restart to apply new params
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Fetch a quote
   */
  private async fetchQuote(): Promise<void> {
    if (!this.isRunning || !this.abortController) {
      return;
    }

    try {
      const quote = await fetchSwapQuote({
        amount: this.params.amount,
        tokenFrom: this.params.tokenFrom,
        tokenTo: this.params.tokenTo,
        chainId: this.params.chainId,
        signal: this.abortController.signal,
        fetchConfig: this.fetchConfig,
      });

      // Reset consecutive errors on success
      this.consecutiveErrors = 0;

      this.callbacks.onQuote(quote);
    } catch (error) {
      // Ignore abort errors when stopping
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      this.consecutiveErrors++;
      this.callbacks.onError?.(error as Error);

      // Stop if too many consecutive errors
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.stopDueToErrors();
      }
    }
  }

  /**
   * Stop due to consecutive errors
   */
  private stopDueToErrors(): void {
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.callbacks.onStop?.("errors");
  }
}

/**
 * Create a quote poller instance
 */
export function createQuotePoller(
  params: QuotePollerParams,
  callbacks: QuotePollerCallbacks,
  config?: PollingConfig,
  fetchConfig?: FetchConfig
): QuotePoller {
  return new QuotePoller(params, callbacks, config, fetchConfig);
}
