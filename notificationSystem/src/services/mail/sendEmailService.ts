import redisClient from '../../config/redis';
import logger from '../../utils/logger';
import { LeakyBucketRateLimiter } from './rateLimiter';
import GmailProvider from './gmailProvider';
import { ConsumeOutcome } from '../../infrastructure/eventTypes';
import { MailSendOutcome } from '@/types/mail';

interface EmailSericeOutcome {
  outcome: ConsumeOutcome;
  payload: MailSendOutcome | -1;
}

class EmailService {
  private provider;
  private rateLimiter;
  constructor() {
    this.provider = new GmailProvider();
    this.rateLimiter = new LeakyBucketRateLimiter();
  }

  async send(payload: any): Promise<EmailSericeOutcome> {
    // 1. Validate email
    //   EmailValidator.validate(options);

    // 2. Check GLOBAL rate limit via Redis
    // This is the KEY part: all workers check the same Redis counter
    const rateLimitKey = `email:${this.provider.name}`;
    const response = await this.rateLimiter.tryAcquire(rateLimitKey);

    if (response === -1) {
      // stop listening to the email messages, the daily quota has reached.
      logger.error(
        'rate-limiter detection: your daily mails quota reached for today.'
      );
      return { payload: -1, outcome: ConsumeOutcome.PauseConsuming };
    } else {
      try {
        const result = await this.provider.send(payload); // fill the payload details
        switch (result.status) {
          case 'SUCCESS': {
            // increament daily quota count after successfully sending email to the user.
            const key = `${rateLimitKey}:daily_count`;
            redisClient.incr(key);
            return { payload: result, outcome: ConsumeOutcome.Ack };
          }
          case 'PARTIAL_FAILURE': {
            // happens only mostly in case of multiple recipient.
            // so we can sent it for manual inspection in dlq.
            const key = `${rateLimitKey}:daily_count`;
            redisClient.incr(key);
            return { payload: result, outcome: ConsumeOutcome.REJECT };
          }

          case 'FAILED': {
            if (result.scope === 'GLOBAL') {
              //  pause the message consumption...
              logger.error('error occured in the mail service: ', result);
              return {
                payload: result,
                outcome: ConsumeOutcome.PauseConsuming
              };
            }

            if (result.scope === 'DAILY_LIMIT_REACHED') {
              logger.error(
                'gmail service response: your daily mails quota reached for today.'
              );
              return { payload: -1, outcome: ConsumeOutcome.PauseConsuming };
            }

            if (result.retryable && result.scope === 'REQUEST') {
              // retry message logic goes here...
              return { payload: result, outcome: ConsumeOutcome.RETRY };
            }

            // non retriable messages goes to dlq.
            return { payload: result, outcome: ConsumeOutcome.REJECT };
          }
        }
      } catch (error: any) {
        logger.error('Email sending email', {
          error: error.message,
          provider: this.provider.name
        });

        throw error;
      }
    }
  }

  async healthCheck() {
    try {
      const response = await this.provider.healthCheck();
      // status: 'healthy'
      if (response.status === 'healthy') {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export default EmailService;
