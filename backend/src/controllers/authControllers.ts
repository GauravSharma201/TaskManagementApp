import { Request, Response } from 'express';
import {
  AuthService,
  UserService,
  TokenStoreService,
  InviteService
} from '../services';
import logger from '../utils/logger';
import { parseDurationToMillis } from '../utils/helper';
import { JWT_CONFIG } from '../config/auth';
import eventBus from '../infrastructure/eventBus';
import { EventTypes } from '../infrastructure/eventTypes';
import {
  loginSchema,
  forgotPasswordSchema,
  registerSchema,
  resendEmailVerificationLinkSchema,
  inviteSchema
} from '../validation/user';
import OrganisationService from '@/services/organisationService';

class AuthController {
  static async login(req: Request, res: Response) {
    logger.info('Login endpoint called');
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      logger.warn('validation error occured login');
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const { email, password } = value;
    try {
      logger.info(`finding user with email: ${email}`);
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        logger.warn(`User not found with email: ${email}`);
        return res.status(404).json({ message: 'User not found' });
      }
      logger.info(`Verifying password for user with email: ${email}`);
      const isPasswordValid = await AuthService.verifyPassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        logger.warn(`Invalid password for user with email: ${email}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      logger.info(`Generating tokens for user with email: ${email}`);
      const accessToken = AuthService.generateAccessToken({ id: user.id });
      const { refreshToken, tokenId } = AuthService.generateRefreshToken({
        id: user.id
      });

      logger.info(`Setting cookies for user with email: ${email}`);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: parseDurationToMillis(JWT_CONFIG.refreshTokenExpiresIn || '7d')
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: parseDurationToMillis(JWT_CONFIG.expiresIn)
      });

      logger.info(`Storing refresh token for user ID: ${user.id}`);

      await TokenStoreService.storeRefreshToken(refreshToken, user.id, tokenId);

      logger.info(`User logged in successfully with email: ${email}`);
      return res
        .status(200)
        .json({ message: 'Login successful', accessToken, refreshToken });
    } catch (error) {
      logger.error('Error logging user in', { error });
      return res.status(500).json({ message: 'Internal Server error' });
    }
  }

  static async register(req: Request, res: Response) {
    logger.info('Register endpoint called');
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      logger.warn('validation issue occured, in registration');
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    const { inviteId } = req.query;
    const { name, email, password } = value;
    try {
      logger.info(`Hashing password ...`);
      const hashedPassword = await AuthService.hashPassword(password);
      logger.info(`Creating user with email: ${email}`);
      const user = await UserService.createUser({
        name,
        email,
        password: hashedPassword
      });
      logger.info(`User created with ID: ${user.id}`);
      const inviteProcessResp = await InviteService.processInvite(
        Number(inviteId),
        false,
        undefined,
        user.id
      );
      if (!inviteProcessResp.success) {
        return res.status(400).json({ message: 'invite processing failed' });
      }
      // need to check organisation...
      return res.status(201).json({
        message: 'User created successfully',
        user,
        metaData: inviteProcessResp.metaData
      });
    } catch (error) {
      logger.error('Error creating user', { error });
      return res.status(500).json({ message: 'Error creating user', error });
    }
  }

  static async logout(req: Request, res: Response) {
    logger.info('Logout endpoint called');
    try {
      const refreshToken = req.cookies['refreshToken'];

      if (!refreshToken) {
        logger.info('No refresh token found — skipping revocation');
      } else {
        logger.info('Verifying refresh token for logout');
        const refreshDecoded = AuthService.verifyToken(refreshToken, true);

        if (refreshDecoded.valid && refreshDecoded.payload?.tokenId) {
          logger.info(
            `Revoking refresh token with ID: ${refreshDecoded.payload.tokenId}`
          );
          await TokenStoreService.revokeRefreshToken(
            refreshDecoded.payload.tokenId
          );
        } else {
          logger.warn('Invalid or expired refresh token during logout');
        }
      }

      // Always clear cookies
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict'
      });
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict'
      });

      logger.info('User logged out successfully');
      return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Error logging user out', { error });
      return res.status(500).json({ message: 'Internal Server error' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    logger.info('forgot password endpoint called');
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      logger.warn('valdation error occured in forgot password');
      return res.status(400).json({
        status: 'error',
        type: 'validate',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    const { email } = value;
    try {
      logger.info(`finding user with email: ${email}`);
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        logger.warn(`User not found with email: ${email}`);
        return res
          .status(200)
          .json({ message: 'Check your mail for password reset link' });
      }

      eventBus.notification.publish({
        payload: {
          data: { id: user.id, name: user.name, email: user.email }
        },
        routingKey: EventTypes.forgotPassword,
        timestamp: new Date().toISOString(),
        type: EventTypes.forgotPassword
      });
      return res
        .status(200)
        .json({ message: 'Check your mail for password reset link' });
    } catch (error) {
      logger.error('Error sending email for password reset :', { error });
      return res.status(500).json({ message: 'Internal Server error' });
    }
  }

  static async verifyUser(req: Request, res: Response) {
    const { token } = req.query;
    try {
      logger.info('inside user email verification.');
      if (!token || typeof token !== 'string') {
        logger.error('missing token in the email verification link');
        return res.status(401).json({
          message:
            'Email verification failed, please generate a new verification link'
        });
      }
      logger.info('verifying user email.');
      const { valid, payload } =
        await AuthService.verifyEmailVerificationToken(token);

      if (valid && payload) {
        logger.info('user email token is verified.');
        const { id } = payload;
        logger.info('marking the user as verified.');
        const user = await UserService.markUserVerifiedById(id);
        if (user) {
          logger.info('user has been marked as verified.');
          return res.status(200).json({
            message: 'user email verified successfully.',
            payload: user
          });
        } else {
          logger.error('user not found in the DB.');
          return res.status(401).json({
            message:
              'user verification failed. please re-generate the email verification link'
          });
        }
      } else {
        logger.warn('user email verification failed: token not valid.');
        return res
          .status(401)
          .json({ message: 'user email verification failed' });
      }
    } catch (error) {
      logger.error('user email verification failed : ', error);
      return res.status(500).json({ message: 'internal server error' });
    }
  }

  static async resendEmailVerificationLink(req: Request, res: Response) {
    const { error, value } = resendEmailVerificationLinkSchema.validate(
      req.body
    );
    if (error) {
      logger.warn('resend email verification , valiadiotn error occured');
      return res.status(400).json({
        message: 'email is required, to resend a verification link'
      });
    }
    const { email } = value;
    try {
      logger.info('fetching user details by email');
      const user = await UserService.getUserByEmail(email);

      if (user && !user.verified) {
        logger.info('generating email verification token.');
        const token = await AuthService.generateEmailVerificationToken({
          id: user.id
        });

        logger.info('sending verification link to the notification service');
        eventBus.notification.publish({
          payload: {
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              verificationLink: `${process.env['BASE_URL']}/verify?token=${token}`
            }
          },
          routingKey: EventTypes.emailVerification,
          timestamp: new Date().toISOString(),
          type: EventTypes.emailVerification
        });
      }

      return res.status(200).json({
        message:
          'if your account exists, a new verification link has been sent.'
      });
    } catch (error) {
      logger.error(
        'error occured , sending the verification email link',
        error
      );
      return res.status(500).json({
        message: 'something went wrong, please retry after some time'
      });
    }
  }

  static async generateInviteLink(req: Request, res: Response) {
    const { user } = req;
    const { error, value } = inviteSchema.validate(req.body);
    if (!user?.id) {
      logger.error('user not found');
      return res.status(401).json({ message: 'user not found' });
    }
    if (error) {
      logger.warn('validation error occured in generate invite link');
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        errors: error.details.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const { email, organisationId, targetType, targetId } = value;

    logger.info(`Generating invite link for user with email: ${email}`);

    const link = await AuthService.generateInviteLink(
      Number(user.id),
      email,
      organisationId,
      targetType,
      targetId
    );

    await eventBus.notification.publish({
      payload: {
        data: {
          id: user.id,
          email: email,
          inviteLink: link
        }
      },
      routingKey: EventTypes.invitation,
      timestamp: new Date().toISOString(),
      type: EventTypes.invitation
    });

    logger.info(`Invite link generated for user with email: ${email}`);
    return res.status(200).json({ message: 'Invite link generated' });
  }

  static async verifyInviteLink(req: Request, res: Response) {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      logger.error('missing token in the invite link');
      return res
        .status(400)
        .json({ message: 'missing token in the invite link' });
    }

    const verifyResp = await AuthService.verifyInviteLink(token);

    if (!verifyResp.valid) {
      logger.warn('invite link verification failed');
      return res
        .status(400)
        .json({ message: 'invite link verification failed' });
    }
    const { inviteId } = verifyResp.payload as Record<string, any>;

    if (!inviteId) {
      logger.warn('missing required fields in the invite link');
      return res
        .status(400)
        .json({ message: 'missing required fields in the invite link' });
    }

    const inviteResp = await InviteService.getInviteById(inviteId);
    if (!inviteResp) {
      logger.warn('invite not found');
      return res.status(400).json({ message: 'problem with the invite link' });
    }
    const userResp = await UserService.getUserByEmail(inviteResp?.email);

    const inviteProcessResp = await InviteService.processInvite(
      inviteId,
      true,
      inviteResp,
      userResp?.id
    );
    if (!inviteProcessResp.success) {
      return res.status(400).json({ message: 'invite processing failed' });
    }
    // need to check organisation...
    return res.status(200).json({
      message: userResp ? 'user exists' : 'user does not exist',
      data: inviteProcessResp.metaData
    });
  }
}

export default AuthController;
