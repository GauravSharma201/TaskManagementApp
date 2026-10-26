import logger from '../../utils/logger';
import { AuthService } from '../../services';
import eventBus from '../../infrastructure/eventBus';
import { EventTypes } from '../../infrastructure/eventTypes';

const userHooks = {
  afterCreate: async (user: any) => {
    logger.info('generating email verification token.');
    const token = await AuthService.generateEmailVerificationToken({
      id: user.id
    });
    logger.info('publishing user.created event to the notification service');
    eventBus.notification.publish({
      payload: {
        type: EventTypes.userCreated,
        timestamp: new Date().toISOString(),
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          verificationLink: `${process.env['BASE_URL']}/verify?token=${token}`
        }
      },
      routingKey: EventTypes.userCreated,
      timestamp: new Date().toISOString(),
      type: EventTypes.userCreated
    });
  }
};

export default userHooks;
