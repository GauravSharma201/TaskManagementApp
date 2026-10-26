import logger from '../utils/logger';
import redisClient from '../config/redis';

class IdempotencyStoreService {
  private static EVENT_ID_PREFIX = 'notif_ingest_event_id:';
  private static TTL_SECONDS = 60 * 60; // 1 hour (tune per need)

  static async claim(eventId: string): Promise<boolean> {
    const key = `${this.EVENT_ID_PREFIX}${eventId}`;

    try {
      // this will only create the record once, if already exist returns null
      const result = await redisClient.set(key, '1', {
        NX: true,
        EX: this.TTL_SECONDS
      });

      return result === 'OK';
    } catch (error) {
      logger.error(
        'Idempotency store unavailable, refusing to claim event',
        error instanceof Error ? error.message : error
      );

      // fail-closed is safer at high volume
      throw error;
    }
  }

  static async getEvent(eventId: string): Promise<boolean> {
    try {
      const key = `${this.EVENT_ID_PREFIX}${eventId}`;
      const result = await redisClient.get(key);
      return result !== null;
    } catch (err) {
      logger.error('Redis error:', err);
      throw err;
    }
  }
}

export default IdempotencyStoreService;
