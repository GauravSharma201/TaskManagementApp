# Production Email Service with Global Redis Rate Limiting

## Architecture Overview

```
┌─────────────────┐
│ RabbitMQ Queue  │  ← Buffers messages (reliability)
│ q.delivery.email│
└────────┬────────┘
         │
    ┌────┴────┐
    │ Worker 1│───┐
    └─────────┘   │
    ┌─────────┐   │
    │ Worker 2│───┼──→ Redis Rate Limiter ──→ Email Provider
    └─────────┘   │    (Global throttle)       (SendGrid/SES)
    ┌─────────┐   │
    │ Worker 3│───┘
    └─────────┘

Flow:
1. Worker pulls message from queue (RabbitMQ prefetch controls concurrency)
2. Worker checks Redis: "Am I allowed to send now?"
3. If YES → Send email → ACK message
4. If NO → NACK with requeue → Message returns to queue
5. Redis ensures global rate limit across ALL workers
```

## Why This Design Works

**RabbitMQ handles:**

- Message buffering and persistence
- Retry logic with TTL queues
- Dead letter queues for permanent failures
- Prefetch for concurrency control

**Redis handles:**

- Global rate limiting (X emails/second across all workers)
- Atomic counter operations
- Token bucket or sliding window algorithms

**Workers stay:**

- Stateless
- Horizontally scalable
- Simple: consume → check Redis → send → ack/nack

---

## 1. Directory Structure

```
src/
├── services/
│   └── email/
│       ├── rateLimit/
│       │   ├── RedisRateLimiter.ts           # The core solution
│       │   ├── TokenBucketRateLimiter.ts
│       │   ├── SlidingWindowRateLimiter.ts
│       │   └── IRateLimiter.ts
│       ├── providers/
│       │   ├── SendGridProvider.ts
│       │   └── SESProvider.ts
│       ├── EmailService.ts
│       └── types.ts
├── workers/
│   └── EmailWorker.ts                         # Consumes from q.delivery.email
└── infrastructure/
    └── redis/
        └── redisClient.ts
```

---

## 2. Rate Limiter Interface

**src/services/email/rateLimit/IRateLimiter.ts**

```typescript
export interface IRateLimiter {
  /**
   * Attempt to acquire a token for sending
   * @returns true if allowed, false if rate limited
   */
  tryAcquire(key: string, cost?: number): Promise<boolean>;

  /**
   * Get remaining capacity
   */
  getRemaining(key: string): Promise<number>;

  /**
   * Reset the rate limiter (for testing/admin)
   */
  reset(key: string): Promise<void>;
}

export interface RateLimitConfig {
  maxTokens: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  redisClient: any; // Redis client instance
}
```

---

## 3. Token Bucket Algorithm (Recommended)

**src/services/email/rateLimit/TokenBucketRateLimiter.ts**

```typescript
import { IRateLimiter, RateLimitConfig } from './IRateLimiter';
import logger from '../../../utils/logger';

/**
 * Token Bucket Rate Limiter
 *
 * How it works:
 * - Bucket starts with N tokens
 * - Each request consumes 1 token
 * - Tokens refill at a constant rate
 * - If bucket empty, request is denied
 *
 * Example: 100 emails/minute
 * - maxTokens: 100
 * - refillRate: 100/60 = 1.67 tokens/second
 *
 * This is GLOBAL across all workers via Redis.
 */
export class TokenBucketRateLimiter implements IRateLimiter {
  private refillRate: number; // tokens per second

  constructor(private config: RateLimitConfig) {
    // Calculate refill rate: tokens per second
    this.refillRate = config.maxTokens / (config.windowMs / 1000);
  }

  async tryAcquire(key: string, cost: number = 1): Promise<boolean> {
    const now = Date.now();
    const bucketKey = `rate_limit:token_bucket:${key}`;

    try {
      // Lua script for atomic token bucket operation
      const luaScript = `
        local bucket_key = KEYS[1]
        local max_tokens = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local cost = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        -- Get current state
        local state = redis.call('HMGET', bucket_key, 'tokens', 'last_refill')
        local tokens = tonumber(state[1]) or max_tokens
        local last_refill = tonumber(state[2]) or now
        
        -- Calculate time passed and tokens to add
        local time_passed = (now - last_refill) / 1000 -- seconds
        local tokens_to_add = time_passed * refill_rate
        
        -- Refill tokens (capped at max)
        tokens = math.min(max_tokens, tokens + tokens_to_add)
        
        -- Check if we can afford the cost
        if tokens >= cost then
          tokens = tokens - cost
          redis.call('HMSET', bucket_key, 'tokens', tokens, 'last_refill', now)
          redis.call('EXPIRE', bucket_key, 3600) -- Expire after 1 hour of inactivity
          return 1 -- Success
        else
          redis.call('HMSET', bucket_key, 'tokens', tokens, 'last_refill', now)
          redis.call('EXPIRE', bucket_key, 3600)
          return 0 -- Rate limited
        end
      `;

      const result = await this.config.redisClient.eval(
        luaScript,
        1, // Number of keys
        bucketKey,
        this.config.maxTokens,
        this.refillRate,
        cost,
        now
      );

      const allowed = result === 1;

      if (!allowed) {
        logger.debug('Rate limit exceeded', {
          key,
          algorithm: 'token_bucket',
          maxTokens: this.config.maxTokens,
          refillRate: this.refillRate
        });
      }

      return allowed;
    } catch (error) {
      logger.error('Rate limiter error', { error, key });
      // Fail open: allow request if Redis is down
      return true;
    }
  }

  async getRemaining(key: string): Promise<number> {
    const bucketKey = `rate_limit:token_bucket:${key}`;
    const now = Date.now();

    try {
      const state = await this.config.redisClient.hmget(
        bucketKey,
        'tokens',
        'last_refill'
      );

      if (!state[0]) {
        return this.config.maxTokens;
      }

      let tokens = parseFloat(state[0]);
      const lastRefill = parseFloat(state[1]) || now;

      // Calculate refilled tokens
      const timePassed = (now - lastRefill) / 1000;
      const tokensToAdd = timePassed * this.refillRate;
      tokens = Math.min(this.config.maxTokens, tokens + tokensToAdd);

      return Math.floor(tokens);
    } catch (error) {
      logger.error('Failed to get remaining tokens', { error, key });
      return this.config.maxTokens;
    }
  }

  async reset(key: string): Promise<void> {
    const bucketKey = `rate_limit:token_bucket:${key}`;
    await this.config.redisClient.del(bucketKey);
  }
}
```

---

## 4. Sliding Window Algorithm (Alternative)

**src/services/email/rateLimit/SlidingWindowRateLimiter.ts**

```typescript
import { IRateLimiter, RateLimitConfig } from './IRateLimiter';
import logger from '../../../utils/logger';

/**
 * Sliding Window Rate Limiter
 *
 * How it works:
 * - Tracks timestamps of requests in a sorted set
 * - Removes requests older than window
 * - Counts requests in current window
 * - Allows if count < max
 *
 * Example: 100 emails/minute
 * - Stores last 100 timestamps
 * - Removes timestamps older than 60 seconds
 * - Allows if < 100 requests in last 60 seconds
 *
 * More accurate than fixed window, but uses more memory.
 */
export class SlidingWindowRateLimiter implements IRateLimiter {
  constructor(private config: RateLimitConfig) {}

  async tryAcquire(key: string, cost: number = 1): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const windowKey = `rate_limit:sliding_window:${key}`;

    try {
      // Lua script for atomic sliding window operation
      const luaScript = `
        local window_key = KEYS[1]
        local max_requests = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local cost = tonumber(ARGV[4])
        
        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', window_key, '-inf', window_start)
        
        -- Count current requests
        local current_count = redis.call('ZCARD', window_key)
        
        -- Check if we can add more
        if current_count + cost <= max_requests then
          -- Add new entries (one per cost)
          for i = 1, cost do
            redis.call('ZADD', window_key, now + i, now .. ':' .. i)
          end
          redis.call('EXPIRE', window_key, 3600)
          return 1 -- Success
        else
          return 0 -- Rate limited
        end
      `;

      const result = await this.config.redisClient.eval(
        luaScript,
        1,
        windowKey,
        this.config.maxTokens,
        windowStart,
        now,
        cost
      );

      const allowed = result === 1;

      if (!allowed) {
        logger.debug('Rate limit exceeded', {
          key,
          algorithm: 'sliding_window',
          maxRequests: this.config.maxTokens,
          windowMs: this.config.windowMs
        });
      }

      return allowed;
    } catch (error) {
      logger.error('Rate limiter error', { error, key });
      return true; // Fail open
    }
  }

  async getRemaining(key: string): Promise<number> {
    const windowStart = Date.now() - this.config.windowMs;
    const windowKey = `rate_limit:sliding_window:${key}`;

    try {
      // Remove old entries
      await this.config.redisClient.zremrangebyscore(
        windowKey,
        '-inf',
        windowStart
      );

      // Count remaining
      const currentCount = await this.config.redisClient.zcard(windowKey);
      return Math.max(0, this.config.maxTokens - currentCount);
    } catch (error) {
      logger.error('Failed to get remaining', { error, key });
      return this.config.maxTokens;
    }
  }

  async reset(key: string): Promise<void> {
    const windowKey = `rate_limit:sliding_window:${key}`;
    await this.config.redisClient.del(windowKey);
  }
}
```

---

## 5. Redis Client Setup

**src/infrastructure/redis/redisClient.ts**

```typescript
import Redis from 'ioredis';
import logger from '../../utils/logger';

class RedisClient {
  private client: Redis;
  private isConnected = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected');
    });

    this.client.on('error', (error) => {
      logger.error('Redis error', { error });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisClient = new RedisClient();
```

---

## 6. Updated Email Service with Rate Limiting

**src/services/email/EmailService.ts**

```typescript
import { IEmailProvider } from './interfaces/IEmailProvider';
import { EmailOptions, EmailResult, EmailError, EmailErrorType } from './types';
import { IRateLimiter } from './rateLimit/IRateLimiter';
import { CircuitBreaker } from './utils/CircuitBreaker';
import { EmailValidator } from './utils/EmailValidator';
import { TemplateEngine } from './templates/TemplateEngine';
import logger from '../../utils/logger';

export class EmailService {
  private circuitBreaker: CircuitBreaker;
  private templateEngine: TemplateEngine;

  constructor(
    private provider: IEmailProvider,
    private rateLimiter: IRateLimiter, // ← Redis-backed rate limiter
    private config: {
      circuitBreaker: {
        failureThreshold: number;
        successThreshold: number;
        timeout: number;
      };
      templatesDir?: string;
    }
  ) {
    this.circuitBreaker = new CircuitBreaker({
      ...config.circuitBreaker,
      name: provider.name
    });

    this.templateEngine = new TemplateEngine(config.templatesDir);
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // 1. Validate email
      EmailValidator.validate(options);

      // 2. Check GLOBAL rate limit via Redis
      // This is the KEY part: all workers check the same Redis counter
      const rateLimitKey = `email:${this.provider.name}`;
      const allowed = await this.rateLimiter.tryAcquire(rateLimitKey);

      if (!allowed) {
        // Rate limited - this is NOT an error, just backpressure
        logger.debug('Global rate limit hit', {
          provider: this.provider.name,
          to: options.to
        });

        return {
          success: false,
          provider: this.provider.name,
          error: new EmailError(
            'Global rate limit exceeded',
            EmailErrorType.RATE_LIMIT,
            true // IMPORTANT: retryable = true
          ),
          timestamp: new Date(),
          retryable: true // Worker will NACK and requeue
        };
      }

      // 3. Render template if needed
      if (options.templateId && !options.html) {
        options.html = await this.templateEngine.render(
          options.templateId,
          options.templateData || {}
        );
      }

      // 4. Send via circuit breaker
      return await this.circuitBreaker.execute(async () => {
        return await this.provider.send(options);
      });
    } catch (error: any) {
      logger.error('Email service error', {
        error: error.message,
        provider: this.provider.name
      });

      if (error instanceof EmailError) {
        return {
          success: false,
          provider: this.provider.name,
          error,
          timestamp: new Date(),
          retryable: error.retryable
        };
      }

      return {
        success: false,
        provider: this.provider.name,
        error: new EmailError(
          error.message,
          EmailErrorType.UNKNOWN,
          false,
          error
        ),
        timestamp: new Date(),
        retryable: false
      };
    }
  }

  async getRemainingCapacity(): Promise<number> {
    const rateLimitKey = `email:${this.provider.name}`;
    return await this.rateLimiter.getRemaining(rateLimitKey);
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.provider.healthCheck();
    } catch (error) {
      logger.error('Health check failed', {
        provider: this.provider.name,
        error
      });
      return false;
    }
  }
}
```

---

## 7. Email Worker (THE CRITICAL PIECE)

**src/workers/EmailWorker.ts**

```typescript
import { Channel, ConsumeMessage } from 'amqplib';
import { EmailService } from '../services/email/EmailService';
import { EmailOptions } from '../services/email/types';
import logger from '../utils/logger';

export class EmailWorker {
  constructor(
    private channel: Channel,
    private emailService: EmailService,
    private queueName: string = 'q.delivery.email'
  ) {}

  async start(): Promise<void> {
    logger.info('Email worker starting', { queue: this.queueName });

    await this.channel.consume(
      this.queueName,
      async (msg) => {
        if (!msg) return;

        try {
          await this.processMessage(msg);
        } catch (error) {
          logger.error('Message processing failed', { error });
          // Let RabbitMQ handle requeue via nack
          this.channel.nack(msg, false, false);
        }
      },
      { noAck: false } // Manual acknowledgment
    );

    logger.info('Email worker started', { queue: this.queueName });
  }

  private async processMessage(msg: ConsumeMessage): Promise<void> {
    const startTime = Date.now();
    const content = JSON.parse(msg.content.toString());
    const messageId = msg.properties.messageId || 'unknown';

    logger.info('Processing email message', {
      messageId,
      to: content.to,
      subject: content.subject
    });

    try {
      // Attempt to send email
      // This will check Redis rate limiter internally
      const result = await this.emailService.send(content as EmailOptions);

      if (result.success) {
        // ✅ SUCCESS: Acknowledge and remove from queue
        this.channel.ack(msg);

        const duration = Date.now() - startTime;
        logger.info('Email sent successfully', {
          messageId,
          provider: result.provider,
          providerMessageId: result.messageId,
          duration
        });
      } else if (result.retryable) {
        // ⚠️ RATE LIMITED or TRANSIENT ERROR
        // NACK with requeue = true
        // Message goes back to queue (or retry queue if configured)

        this.channel.nack(msg, false, true);

        logger.warn('Email send failed (retryable)', {
          messageId,
          error: result.error?.message,
          errorType: result.error?.type,
          action: 'requeued'
        });
      } else {
        // ❌ PERMANENT ERROR
        // NACK with requeue = false
        // Message goes to DLQ

        this.channel.nack(msg, false, false);

        logger.error('Email send failed (permanent)', {
          messageId,
          error: result.error?.message,
          errorType: result.error?.type,
          action: 'sent_to_dlq'
        });
      }
    } catch (error: any) {
      // Unexpected error - treat as retryable
      logger.error('Unexpected error processing message', {
        messageId,
        error: error.message
      });

      this.channel.nack(msg, false, true);
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping email worker');
    await this.channel.close();
  }
}
```

---

## 8. Factory with Rate Limiter

**src/services/email/EmailServiceFactory.ts**

```typescript
import { EmailService } from './EmailService';
import { SendGridProvider } from './providers/SendGridProvider';
import { TokenBucketRateLimiter } from './rateLimit/TokenBucketRateLimiter';
import { redisClient } from '../../infrastructure/redis/redisClient';
import { emailConfig } from '../../config/email.config';

export class EmailServiceFactory {
  static create(): EmailService {
    // Create provider
    const provider = new SendGridProvider(emailConfig.sendgrid.apiKey);

    // Create Redis-backed rate limiter
    const rateLimiter = new TokenBucketRateLimiter({
      maxTokens: emailConfig.rateLimit.maxTokens,
      windowMs: emailConfig.rateLimit.windowMs,
      redisClient: redisClient.getClient()
    });

    // Create email service
    return new EmailService(provider, rateLimiter, {
      circuitBreaker: emailConfig.circuitBreaker,
      templatesDir: emailConfig.templatesDir
    });
  }
}
```

---

## 9. Configuration

**src/config/email.config.ts**

```typescript
export const emailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'sendgrid',

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || ''
  },

  from: {
    email: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    name: process.env.EMAIL_FROM_NAME || 'Your App'
  },

  // GLOBAL rate limit (enforced via Redis across all workers)
  rateLimit: {
    maxTokens: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '100'),
    // 100 emails per minute = 1.67 emails/second
    windowMs: parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || '60000')
  },

  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000
  },

  templatesDir: './src/services/email/templates/templates'
};
```

---

## 10. Environment Variables

**.env**

```bash
# Email Provider
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_api_key

# Email Config
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=Your App

# GLOBAL Rate Limiting (via Redis)
EMAIL_RATE_LIMIT_MAX=100          # Max 100 emails
EMAIL_RATE_LIMIT_WINDOW_MS=60000  # Per 60 seconds

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
```

---

## 11. Server Startup

**src/server.ts**

```typescript
import { eventBus } from './events';
import { EmailWorker } from './workers/EmailWorker';
import { EmailServiceFactory } from './services/email/EmailServiceFactory';
import { rabbitMQConnection } from './infrastructure/rabbitmq/connection';
import { redisClient } from './infrastructure/redis/redisClient';
import logger from './utils/logger';

async function startServer() {
  try {
    // 1. Connect to Redis (for rate limiting)
    if (!redisClient.isReady()) {
      throw new Error('Redis not connected');
    }
    logger.info('Redis connected');

    // 2. Connect to RabbitMQ
    await rabbitMQConnection.connect();
    const channel = rabbitMQConnection.getChannel();
    logger.info('RabbitMQ connected');

    // 3. Create email service with Redis rate limiter
    const emailService = EmailServiceFactory.create();
    logger.info('Email service initialized with Redis rate limiting');

    // 4. Start email worker(s)
    const emailWorker = new EmailWorker(channel, emailService);
    await emailWorker.start();
    logger.info('Email worker started');

    // 5. Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await emailWorker.stop();
      await rabbitMQConnection.disconnect();
      await redisClient.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
```

---

## 12. How It All Works Together

### Scenario: 3 Workers, 100 emails/minute limit

```
Time: 00:00
Redis Token Bucket: 100 tokens available

┌─────────┐  Pull msg  ┌──────────────┐
│ Worker 1│────────────→│ RabbitMQ     │
└─────────┘             │ q.delivery.  │
┌─────────┐  Pull msg  │ email        │
│ Worker 2│────────────→│              │
└─────────┘             │ Prefetch: 10 │
┌─────────┐  Pull msg  │ (each worker)│
│ Worker 3│────────────→└──────────────┘
└─────────┘

Each worker has 10 messages in-flight (prefetch=10)
Total: 30 messages pulled from queue

Worker 1: tryAcquire() → Redis: tokens=100 → OK, send → tokens=99
Worker 2: tryAcquire() → Redis: tokens=99 → OK, send → tokens=98
Worker 3: tryAcquire() → Redis: tokens=98 → OK, send → tokens=97
...
(All workers sending as fast as Redis allows)

After 100 sends:
Redis: tokens=0

Worker 1: tryAcquire() → Redis: tokens=0 → DENIED
Worker 1: NACK with requeue → message returns to queue

Worker 2: tryAcquire() → Redis: tokens=0 → DENIED
Worker 2: NACK with requeue → message returns to queue

Worker 3: tryAcquire() → Redis: tokens=0 → DENIED
Worker 3: NACK with requeue → message returns to queue

Time: 00:01 (1 second later)
Redis refills: tokens = 0 + (1.67 * 1) = 1.67 tokens

Worker 1: tryAcquire() → Redis: tokens=1 → OK, send → tokens=0
Worker 2: tryAcquire() → Redis: tokens=0 → DENIED → NACK
Worker 3: tryAcquire() → Redis: tokens=0 → DENIED → NACK

Time: 00:02
Redis refills: tokens = 0 + (1.67 * 1) = 1.67 tokens
...continues at 1.67 emails/second = 100 emails/minute
```

---

## 13. Key Benefits

### ✅ **Global Rate Limiting**

- All workers share the same Redis counter
- Scaling workers doesn't bypass limits
- Provider limits are respected

### ✅ **RabbitMQ Semantics Intact**

- Messages are buffered in the queue
- Retry queues work as designed
- DLQ receives permanent failures
- Prefetch still controls concurrency

### ✅ **Workers Stay Stateless**

- No per-worker state
- Horizontally scalable
- Can restart/crash without issues

### ✅ **Clear Failure Handling**

- Rate limited → NACK with requeue
- Transient error → NACK with requeue (retry queue)
- Permanent error → NACK without requeue (DLQ)

### ✅ **Fail-Safe**

- If Redis is down, fail open (allow requests)
- If RabbitMQ is down, messages persist in queue
- Circuit breaker prevents cascading failures

---

## 14. Monitoring

**Metrics to track:**

```typescript
// In your EmailWorker
metrics.increment('email.processed');
metrics.increment(`email.result.${result.success ? 'success' : 'failure'}`);
metrics.increment(`email.error_type.${result.error?.type}`);
metrics.gauge(
  'email.rate_limit.remaining',
  await emailService.getRemainingCapacity()
);
metrics.histogram('email.processing_time_ms', duration);
```

---

## 15. Testing

**Test Redis rate limiting:**

```typescript
import { TokenBucketRateLimiter } from '../rateLimit/TokenBucketRateLimiter';
import Redis from 'ioredis-mock';

describe('TokenBucketRateLimiter', () => {
  it('should enforce global rate limit', async () => {
    const redis = new Redis();
    const limiter = new TokenBucketRateLimiter({
      maxTokens: 10,
      windowMs: 10000, // 10 seconds
      redisClient: redis
    });

    // Should allow first 10 requests
    for (let i = 0; i < 10; i++) {
      const allowed = await limiter.tryAcquire('test');
      expect(allowed).toBe(true);
    }

    // Should deny 11th request
    const denied = await limiter.tryAcquire('test');
    expect(denied).toBe(false);
  });
});
```

---

## Installation

```bash
npm install ioredis
npm install --save-dev @types/ioredis ioredis-mock
```

---

This design gives you **exactly** what you need: RabbitMQ for reliability + Redis for global pacing. Workers remain simple and stateless.
