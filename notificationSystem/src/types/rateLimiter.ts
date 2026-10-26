export interface IRateLimiter {
  /**
   * Attempt to acquire a token for sending
   * @returns 1 if allowed, 0 if rate limited and -1 daily quota reached
   */
  tryAcquire(key: string, cost?: number): Promise<1 | -1>;

  /**
   * Get remaining capacity
   */
  //   getRemaining(key: string): Promise<number>;

  /**
   * Reset the rate limiter (for testing/admin)
   */
  //   reset(key: string): Promise<void>;
}

export interface RateLimitConfig {
  maxTokens: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  redisClient: any; // Redis client instance
}
