import { DomainEvent } from '../domain/events/domainEvents';
import amqp from 'amqplib';
import { EventTypes, ConsumeOutcome } from '../infrastructure/eventTypes';
import { NotificationService } from '../services';
import logger from '../utils/logger';
import { NotificationError } from '../errors/notificationError';

const NotificationIngestHandler = async (
  parsedMessage: DomainEvent,
  _rawMsg: amqp.Message
): Promise<ConsumeOutcome> => {
  try {
    switch (parsedMessage.type) {
      case EventTypes.userCreated:
        await NotificationService.userCreated(parsedMessage);
        return ConsumeOutcome.Ack;

      case EventTypes.forgotPassword:
        logger.info('catching user forgot password event ==>', parsedMessage);
        // select template for Forgot password.
        // push to the email notification.
        return ConsumeOutcome.Ack;

      case EventTypes.emailVerification:
        logger.info(
          'catching user email verification event ==>',
          parsedMessage
        );
        // select template for Forgot password.
        // push to the email notification.
        return ConsumeOutcome.Ack;

      default:
        // message does not fit for any described types
        return ConsumeOutcome.REJECT;
    }
  } catch (error) {
    logger.error('notification handler error', error);

    if (error instanceof NotificationError) {
      if (!error.retriable) {
        return ConsumeOutcome.REJECT;
      }
      return ConsumeOutcome.RETRY;
    }

    // Unknown errors are safest to retry
    return ConsumeOutcome.RETRY;
  }
};

export default NotificationIngestHandler;
