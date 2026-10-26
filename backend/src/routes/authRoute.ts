import { Router } from 'express';
import { AuthController } from '../controllers';
import asyncHandler from '../middleware/asyncHandler';
import { authenticateUser } from '../middleware/authHandler';

const authRouter = Router();

authRouter.post('/login', asyncHandler(AuthController.login));
authRouter.post('/register', asyncHandler(AuthController.register));
authRouter.post('/logout', asyncHandler(AuthController.logout));
authRouter.post(
  '/forgot-password',
  asyncHandler(AuthController.forgotPassword)
);
authRouter.get('/verify', asyncHandler(AuthController.verifyUser));
authRouter.post(
  '/resendEmailVerifLink',
  asyncHandler(AuthController.verifyUser)
);
authRouter.post(
  '/generateInviteLink',
  authenticateUser,
  asyncHandler(AuthController.verifyUser)
);

authRouter.get(
  '/verifyInviteLink',
  asyncHandler(AuthController.verifyInviteLink)
);

export default authRouter;
