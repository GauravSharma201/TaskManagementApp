// src/config/redis.ts
import { createClient } from 'redis';
import logger from '../utils/logger';

const redisClient = createClient({
  url: `redis://${process.env['REDIS_PASSWORD'] ? `:${process.env['REDIS_PASSWORD']}@` : ''}${process.env['REDIS_HOST'] || 'localhost'}:${process.env['REDIS_PORT'] || '6379'}/${process.env['REDIS_DB'] || '0'}`,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        logger.error('Max Redis reconnection attempts reached');
        return new Error('Max retries reached');
      }
      return retries * 50;
    }
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
});

export default redisClient;
