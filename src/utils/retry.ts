import type { FetchConfig } from "../types/config.js";
import { isNonRetryableError } from "../errors/index.js";

/**
 * Default fetch configuration
 */
export const DEFAULT_FETCH_CONFIG: Required<FetchConfig> = {
  timeout: 10000,
  maxRetries: 3,
  baseBackoff: 1000,
  maxBackoff: 5000,
  fetch: globalThis.fetch,
};

/**
 * Parse Retry-After header (supports both seconds and HTTP-date formats)
 */
export function parseRetryAfter(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  const trimmed = retryAfter.trim();
  if (!trimmed) return null;

  // Try parsing as seconds
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Try parsing as HTTP date
  try {
    const date = new Date(trimmed);
    const delay = date.getTime() - Date.now();
    return delay > 0 ? delay : null;
  } catch {
    return null;
  }
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(
  attempt: number,
  baseBackoff: number,
  maxBackoff: number,
  retryAfter?: string | null
): number {
  // If Retry-After header exists and is valid, use it
  if (retryAfter) {
    const retryAfterDelay = parseRetryAfter(retryAfter);
    if (retryAfterDelay !== null && retryAfterDelay > 0) {
      return retryAfterDelay;
    }
  }

  // Calculate exponential backoff
  let delay = baseBackoff * Math.pow(2, attempt);
  if (delay > maxBackoff) {
    delay = maxBackoff;
  }

  // Add jitter (random value between delay/2 and delay)
  const minDelay = delay / 2;
  const jitter = Math.random() * (delay - minDelay);
  return minDelay + jitter;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Options for withRetry function
 */
export interface RetryOptions {
  maxRetries: number;
  baseBackoff: number;
  maxBackoff: number;
  signal?: AbortSignal;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseBackoff, maxBackoff, signal, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check if aborted before making request
    if (signal?.aborted) {
      throw new Error("Request aborted");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      // Don't retry on non-retryable errors
      if (isNonRetryableError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateBackoff(attempt, baseBackoff, maxBackoff);
      onRetry?.(attempt, lastError, delay);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Unknown error after retries");
}
