import { IRateLimiter } from '../../types/rateLimiter';
import logger from '../../utils/logger';
import redisClient from '../../config/redis';

export class LeakyBucketRateLimiter implements IRateLimiter {
  constructor() {
    // Calculate refill rate: tokens per second
  }

  async tryAcquire(key: string): Promise<1 | -1> {
    const now = Date.now();

    try {
      // Lua script for atomic token bucket operation
      const luaScript = `
        -- KEYS[1] = 'gmail_last_processed'
        -- KEYS[2] = 'gmail_daily_counter'
        -- ARGV[1] = current_time_ms
        -- ARGV[2] = interval_ms
        -- ARGV[3] = max_daily_limit

        local daily_count = tonumber(redis.call('GET', KEYS[2]) or 0)

        -- 1. Check Daily Quota first
        if daily_count >= tonumber(ARGV[3]) then
            return -1 -- Special code for "Daily Limit Exceeded"
        end

        -- 2. Calculate Leaky Bucket timing
        local last_time = tonumber(redis.call('GET', KEYS[1]) or 0)
        local now = tonumber(ARGV[1])
        local target_time = math.max(last_time, now) + tonumber(ARGV[2])

        -- 3. Update both values
        redis.call('SET', KEYS[1], target_time)
        -- can't increament daily count here before even sending mail
        -- redis.call('INCR', KEYS[2])

        -- Optional: Set daily counter to expire at the end of the day
        -- (Or handle expiration via your Node.js initialization)

        return target_time
      `;

      const max_daily_limit = process.env['MAX_DAILY_LIMIT'];
      if (!max_daily_limit) {
        throw new Error('need max daily limit in the environment variables.');
      }

      const targetTime = (await redisClient.eval(
        luaScript,
        {
          keys: [`${key}:last_processed`, `${key}:daily_count`],
          arguments: [`${now}`, '1000', max_daily_limit]
        }
        // 2, 'last_processed', 'daily_count', Date.now(), 1000, 2000
      )) as -1 | number;

      if (targetTime === -1) {
        console.error('Daily quota reached! Requeueing message.');
        // channel.nack(msg, false, true);
        return -1;
      }

      const delay = targetTime - now;

      if (delay > 0) {
        await new Promise((res) => setTimeout(res, delay));
      }

      return 1;
    } catch (error) {
      const err = error instanceof Error ? error.message : error;
      logger.error('Rate limiter error', { err, key });
      // Fail open: allow request if Redis is down
      throw error;
    }
  }
}
