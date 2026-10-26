import { JWT_CONFIG } from '../config/auth';
import { AuthService, TokenStoreService } from '../services';
import { parseDurationToMillis } from '../utils/helper';
import logger from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const accessToken = req.cookies['accessToken'];
  const refreshToken = req.cookies['refreshToken'];

  if (!accessToken || !refreshToken) {
    logger.warn('Authentication failed: Missing tokens.');
    return res
      .status(401)
      .json({ message: 'Authentication failed: please login again.' });
  }

  logger.info('Verifying access token.');
  const decoded = AuthService.verifyToken(accessToken);
  if (decoded.valid && decoded.payload) {
    logger.info('Access token is valid.');
    req.user = { id: decoded.payload?.id.toString() };
    return next();
  }

  if (!decoded.expired) {
    logger.warn('Authentication failed: Invalid access token.');
    return res
      .status(401)
      .json({ message: 'Authentication failed: please login again.' });
  }
  logger.warn('Authentication failed: Invalid access token.');
  const refreshDecoded = AuthService.verifyToken(refreshToken, true);

  if (!refreshDecoded.valid) {
    logger.warn('Authentication failed: Invalid refresh token.');
    return res
      .status(401)
      .json({ message: 'Authentication failed: please login again.' });
  }

  logger.info('searching refresh token in the token store.');

  if (!refreshDecoded.payload?.tokenId) {
    logger.warn('Authentication failed: Invalid refresh token payload.');
    return res
      .status(401)
      .json({ message: 'Authentication failed: please login again.' });
  }
  const token = await TokenStoreService.getRefreshToken(
    refreshDecoded.payload.tokenId
  );
  if (!token) {
    logger.warn('Authentication failed: Refresh token not found in store.');
    return res
      .status(401)
      .json({ message: 'Authentication failed: please login again.' });
  }

  logger.info('Generating new access token.');
  const userId = token.userId;
  const newAccessToken = AuthService.generateAccessToken({ id: userId });

  logger.info('Setting new access token cookie.');
  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: parseDurationToMillis(JWT_CONFIG.expiresIn)
  });
  req.user = { id: userId.toString() };
  return next();
}
