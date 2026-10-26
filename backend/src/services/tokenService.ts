import { JWT_CONFIG } from '@/config/auth';
import redisClient from '@/config/redis';
import { parseDurationToSeconds } from '@/utils/helper';
import logger from '@/utils/logger';

interface TokenData {
  userId: number;
  refreshToken: string;
  issuedAt: number;
}

class TokenStoreService {
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';

  /**
   * Store refresh token in Redis
   */
  async storeRefreshToken(
    token: string,
    userId: number,
    tokenId: string
  ): Promise<void> {
    if (!token || !tokenId) {
      logger.warn('Invalid input: token or tokenId missing.');
      return;
    }
    const key = `${this.REFRESH_TOKEN_PREFIX}${tokenId}`;
    const data: TokenData = {
      userId,
      refreshToken: token,
      issuedAt: Date.now()
    };

    const expiresIn = parseDurationToSeconds(
      JWT_CONFIG.refreshTokenExpiresIn || '7d'
    );

    if (expiresIn <= 0) {
      logger.error('Invalid refresh token expiry configuration.');
      throw new Error('Invalid refresh token expiry');
    }
    try {
      /* 
      setting redis ttl based on refresh token expiry
      to automatically clean up expired tokens
    */
      await redisClient.setEx(key, expiresIn, JSON.stringify(data));

      logger.info(`Refresh token stored for user ${userId}`);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw error;
    }
  }

  /**
   * Retrieve refresh token from Redis
   */
  async getRefreshToken(tokenId: string): Promise<TokenData | null> {
    if (!tokenId) {
      logger.warn('No tokenId provided to retrieve refresh token.');
      return null;
    }

    const key = `${this.REFRESH_TOKEN_PREFIX}${tokenId}`;

    try {
      const data = await redisClient.get(key);
      if (!data) {
        logger.warn(`Refresh token not found for tokenId: ${tokenId}`);
        return null;
      }

      try {
        const parsed: TokenData = JSON.parse(data);
        logger.info(`Refresh token retrieved for tokenId: ${tokenId}`);
        return parsed;
      } catch (parseError) {
        logger.error(
          `Invalid token data format for tokenId: ${tokenId}`,
          parseError
        );
        return null;
      }
    } catch (error) {
      logger.error('Redis error retrieving refresh token:', error);
      throw error; // bubble up infra issues
    }
  }

  /**
   * Revoke/delete refresh token from Redis
   */
  async revokeRefreshToken(tokenId: string): Promise<boolean> {
    try {
      if (!tokenId) {
        logger.warn('No tokenId provided to revoke refresh token.');
        return false;
      }
      const key = `${this.REFRESH_TOKEN_PREFIX}${tokenId}`;
      const deleted = await redisClient.del(key);
      if (deleted === 0) {
        logger.warn(`No refresh token found for tokenId: ${tokenId}`);
        return false;
      }
      logger.info(`Refresh token revoked: ${tokenId}`);
      return true;
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    }
  }
}

export default new TokenStoreService();
