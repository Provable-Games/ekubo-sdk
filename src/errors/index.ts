/**
 * Base error class for all Ekubo SDK errors
 */
export class EkuboError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "EkuboError";
    Object.setPrototypeOf(this, EkuboError.prototype);
  }
}

/**
 * Error thrown when there is insufficient liquidity for a swap
 * This error should NOT be retried
 */
export class InsufficientLiquidityError extends EkuboError {
  constructor(message = "Insufficient liquidity for swap") {
    super(message, "INSUFFICIENT_LIQUIDITY");
    this.name = "InsufficientLiquidityError";
    Object.setPrototypeOf(this, InsufficientLiquidityError.prototype);
  }
}

/**
 * Error thrown when an API request fails after all retries
 */
export class ApiError extends EkuboError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: unknown
  ) {
    super(message, "API_ERROR", cause);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Error thrown when rate limited by the API
 */
export class RateLimitError extends EkuboError {
  constructor(
    message = "Rate limited by API",
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT");
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends EkuboError {
  constructor(message = "Request timed out", public readonly timeout: number) {
    super(message, "TIMEOUT");
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when a request is aborted
 */
export class AbortError extends EkuboError {
  constructor(message = "Request aborted") {
    super(message, "ABORTED");
    this.name = "AbortError";
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}

/**
 * Error thrown when token resolution fails
 */
export class TokenNotFoundError extends EkuboError {
  constructor(
    public readonly tokenIdentifier: string,
    message = `Token not found: ${tokenIdentifier}`
  ) {
    super(message, "TOKEN_NOT_FOUND");
    this.name = "TokenNotFoundError";
    Object.setPrototypeOf(this, TokenNotFoundError.prototype);
  }
}

/**
 * Error thrown when chain configuration is invalid or missing
 */
export class InvalidChainError extends EkuboError {
  constructor(
    public readonly chainId: string,
    message = `Invalid or unsupported chain: ${chainId}`
  ) {
    super(message, "INVALID_CHAIN");
    this.name = "InvalidChainError";
    Object.setPrototypeOf(this, InvalidChainError.prototype);
  }
}

/**
 * Check if an error should not be retried
 */
export function isNonRetryableError(error: unknown): boolean {
  if (error instanceof InsufficientLiquidityError) return true;
  if (error instanceof AbortError) return true;
  if (error instanceof TokenNotFoundError) return true;
  if (error instanceof InvalidChainError) return true;
  return false;
}
