import jwt, { SignOptions } from 'jsonwebtoken';
import { JWT_CONFIG } from '@/config/auth';
import { parseDurationToMillis } from './helper';

// <----------------SAMPLE IMPLEMENTATION------------------>
// const current_time = Math.floor(Date.now() / 1000);
// const expiration_time = current_time + 864000; // ten days

// const private_key: string = JWT_CONFIG.secret as string;

// jwt.sign({ userId: 1 }, private_key, { algorithm: 'HS256', expiresIn: '1h' });

interface JwtPayload {
  id: number;
  sessionId?: string;
  role?: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  const secret = process.env['JWT_SECRET'] || 'secret';
  const options: SignOptions = {
    expiresIn: parseDurationToMillis(JWT_CONFIG.expiresIn),
    algorithm: JWT_CONFIG.algorithm as jwt.Algorithm
  };
  return jwt.sign(payload, secret, options);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const secret = process.env['JWT_REFRESH_SECRET'] || 'secret';
  const options: SignOptions = {
    expiresIn: parseDurationToMillis(JWT_CONFIG.refreshTokenExpiresIn || '7d'),
    algorithm: JWT_CONFIG.algorithm as jwt.Algorithm
  };
  return jwt.sign(payload, secret, options);
};
