import jwt, { SignOptions } from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/auth';
import { parseDurationToMillis } from '../utils/helper';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import UserService from './userService';
import { InvitesType } from '../types';

// <----------------SAMPLE IMPLEMENTATION------------------>
// const current_time = Math.floor(Date.now() / 1000);
// const expiration_time = current_time + 864000; // ten days

// const private_key: string = JWT_CONFIG.secret as string;

// jwt.sign({ userId: 1 }, private_key, { algorithm: 'HS256', expiresIn: '1h' });

interface MyJwtPayload extends jwt.JwtPayload {
  id: number;
  sessionId?: string;
  role?: string;
  tokenId?: string;
  [key: string]: any;
}

interface VerifyResult {
  valid: boolean;
  expired: boolean;
  payload?: MyJwtPayload;
  error?: Error;
}

class AuthService {
  static generateAccessToken(payload: MyJwtPayload) {
    const secret = JWT_CONFIG.secret;
    const options: SignOptions = {
      expiresIn: parseDurationToMillis(JWT_CONFIG.expiresIn),
      algorithm: JWT_CONFIG.algorithm as jwt.Algorithm
    };

    return jwt.sign(payload, secret, options);
  }

  static generateRefreshToken(payload: MyJwtPayload) {
    const secret = JWT_CONFIG.refreshSecretKey;
    const options: SignOptions = {
      expiresIn: parseDurationToMillis(
        JWT_CONFIG.refreshTokenExpiresIn || '7d'
      ),
      algorithm: JWT_CONFIG.algorithm as jwt.Algorithm
    };
    const tokenId = uuidv4();
    const exntendedPayload = {
      ...payload,
      tokenId // adding unique id to each token
    };
    return {
      refreshToken: jwt.sign(exntendedPayload, secret, options),
      tokenId
    };
  }

  static verifyToken(token: string, isRefreshToken = false): VerifyResult {
    try {
      const secret = isRefreshToken
        ? JWT_CONFIG.refreshSecretKey
        : JWT_CONFIG.secret;
      const decoded = jwt.verify(token, secret) as MyJwtPayload;
      return { valid: true, expired: false, payload: decoded };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        logger.error('Token is expired:', error);
        const payload = jwt.decode(token) as MyJwtPayload;
        return { valid: false, expired: true, payload, error };
      }
      logger.error('Token verification failed:', error);
      return { valid: false, expired: false, error };
    }
  }

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }

  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async generateEmailVerificationToken(payload: MyJwtPayload) {
    const secret = JWT_CONFIG.emailVerificationSecretKey;
    const options: SignOptions = {
      expiresIn: parseDurationToMillis(JWT_CONFIG.emailVerificationExpiry),
      algorithm: JWT_CONFIG.algorithm as jwt.Algorithm
    };
    return jwt.sign(payload, secret, options);
  }

  static async verifyEmailVerificationToken(
    token: string
  ): Promise<{ valid: boolean; payload?: MyJwtPayload; error?: Error }> {
    try {
      logger.info('inside emial verification token');
      const secret = JWT_CONFIG.emailVerificationSecretKey;
      if (!secret) {
        logger.warn('missing email verification secret key...');
        throw new Error('Jwt token verification failed');
      }
      logger.info('verifying the email token...');
      const decoded = jwt.verify(token, secret) as MyJwtPayload;
      return { valid: true, payload: decoded };
    } catch (error) {
      logger.error('email verification token failed ==>', error);
      const err = error instanceof Error ? error : new Error(String(error));
      return { valid: false, error: err };
    }
  }

  static async generateInviteLink(
    inviter: number,
    email: string,
    organisationId: number,
    targetType: InvitesType,
    targetId: number
  ) {
    logger.info('generating invite link');
    const inviteSecretKey = JWT_CONFIG.inviteSecretKey;
    if (!inviteSecretKey) {
      throw new Error('missing invite secret key');
    }

    logger.info('registering invite into db');
    const inviteResp = await UserService.registerInvite({
      inviter: inviter,
      email: email,
      targetType,
      targetId,
      ...(organisationId ? { organisationId } : {})
    });

    const payload = {
      inviteId: inviteResp.id
    };
    const options: SignOptions = {
      expiresIn: parseDurationToMillis(JWT_CONFIG.inviteExpiry),
      algorithm: JWT_CONFIG.algorithm as jwt.Algorithm
    };
    const token = jwt.sign(payload, inviteSecretKey, options);

    const link = `${process.env['CLIENT_BASE_URL']}/invite?token=${token}`;
    return link;
  }

  static async verifyInviteLink(token: string) {
    const secret = JWT_CONFIG.inviteSecretKey;
    if (!secret) {
      throw new Error('missing invite secret key');
    }
    try {
      logger.info('verifying the invite token...');
      const decoded = jwt.verify(token, secret) as MyJwtPayload;
      return { valid: true, payload: decoded };
    } catch (error) {
      logger.error('invite verification token failed ==>', error);
      const err = error instanceof Error ? error : new Error(String(error));
      return { valid: false, error: err };
    }
  }
}

export default AuthService;
