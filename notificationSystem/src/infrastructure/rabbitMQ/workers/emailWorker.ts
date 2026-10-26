import Consumer from '../consumer';
import amqp from 'amqplib';
import config from '../../../config/rabbitMQ';
import { DomainEvent } from '../../../domain/events/domainEvents';
import { IdempotencyStoreService } from '../../../services/index';
import { EmailService } from '../../../services/index';
import { RoutingKeys } from '../routingKeys';
import { ChannelNames } from '../channelNames';
import logger from '../../../utils/logger';
import { ConsumeOutcome } from '../../eventTypes';
import { getNextUtcMidnight } from '../../../utils/helper';

enum WorkerStatus {
  IDLE = 'idle',
  IN_PROGRESS = 'in-progress',
  CONSUMING = 'consuming'
}

class EmailConusmer {
  private consumer: Consumer;
  private channel: amqp.Channel | null;
  private EmailService: EmailService;
  private config: typeof config;
  private status: WorkerStatus;
  private timers: NodeJS.Timeout[] = [];

  constructor(consumer: Consumer) {
    this.consumer = consumer;
    this.channel = null;
    this.config = config;
    this.EmailService = new EmailService();
    this.status = WorkerStatus.IDLE;
  }

  async handleMsg(
    parsedMsg: DomainEvent,
    rawMsg: amqp.Message,
    channel: amqp.Channel
  ) {
    try {
      // checking for duplicate events at the inbound layer...
      const check = await IdempotencyStoreService.getEvent(
        parsedMsg.payload?.eventId
      );
      if (check) {
        channel.ack(rawMsg);
        return;
      }
      const consumeRes = await this.EmailService.send(parsedMsg.payload);

      // we can handle the message acknowledgement here...
      switch (consumeRes.outcome) {
        case ConsumeOutcome.Ack:
          await IdempotencyStoreService.claim(parsedMsg.payload?.eventId);
          channel.ack(rawMsg);
          break;

        case ConsumeOutcome.RETRY:
          this.publishToRetryQueue(channel, parsedMsg, rawMsg);
          channel.reject(rawMsg, false);
          break;

        case ConsumeOutcome.PauseConsuming:
          // cancelling the consumer..
          if (
            this.status === WorkerStatus.IDLE ||
            this.status === WorkerStatus.IN_PROGRESS
          ) {
            return;
          }
          //On consumer cancel failure, the current message is DLQed.
          //This is intentional to guarantee system stability under GLOBAL failures.
          await this.consumer.cancel({
            channelName: ChannelNames.EmailNotificationConsumer
          });
          // message stays nack, rabbitmq will re queue it.
          this.status = WorkerStatus.IDLE;

          // need a circuit breaker to handle the response logic.
          if (consumeRes.payload === -1) {
            // we have hit the daily-quota, schedule a retry for UTC midnight
            const nextMidnight = getNextUtcMidnight(); // Implement helper
            setTimeout(
              () => this.scheduleResume('QUOTA_RESET'),
              nextMidnight.getTime() - Date.now()
            );
          } else {
            // we are facing the service provider issue, schedule a health check polling
            this.scheduleHealthPolling();
          }
          // alter that the consumer is down...
          logger.warn(
            'the consumer has stopped consuming emails due to the service provider issues: ',
            consumeRes.payload === -1 ? 'QUOTA_EXCEEDED' : 'SERVICE_DOWN'
          );
          break;

        case ConsumeOutcome.REJECT:
          this.publishToDLQ(channel, parsedMsg);
          channel.reject(rawMsg, false);
          break;

        default:
          this.publishToDLQ(channel, parsedMsg);
          channel.reject(rawMsg, false);
          break;
      }
    } catch (error) {
      // either idempotency store or email showed an error
      this.publishToDLQ(channel, parsedMsg);
      channel.reject(rawMsg, false);
    }
  }

  publishToDLQ(channel: amqp.Channel, parsedMsg: DomainEvent) {
    const content = Buffer.from(
      typeof parsedMsg === 'object' ? JSON.stringify(parsedMsg) : parsedMsg
    );
    channel.publish(
      this.config.exchange.emailDLXExchange.name,
      RoutingKeys.emailWorkerDLQ,
      content
    );
  }

  publishToRetryQueue(
    channel: amqp.Channel,
    parsedMsg: DomainEvent,
    rawMsg: amqp.Message
  ) {
    const { exchange } = this.config;
    const { emailDLXExchange } = exchange;
    const maxRetryCount = emailDLXExchange.maxRetryCount;
    const {
      emailWorkerRetry1,
      emailWorkerRetry2,
      emailWorkerRetry3,
      emailWorkerDLQ
    } = RoutingKeys;

    // 1. Extract current retry count from headers
    // RabbitMQ uses 'x-death' for DLX info, but for custom logic,
    // we often use a custom header like 'x-retry-count'
    const customHeaders = rawMsg.properties.headers ?? {};
    let retryCount = (customHeaders['x-retry-count'] as number) ?? 0;

    const content = Buffer.from(
      typeof parsedMsg === 'object' ? JSON.stringify(parsedMsg) : parsedMsg
    );

    let targetRoutingKey: string;

    // 2. Determine the destination based on the count
    if (retryCount === 0) {
      targetRoutingKey = emailWorkerRetry1;
    } else if (retryCount === 1) {
      targetRoutingKey = emailWorkerRetry2;
    } else if (retryCount <= maxRetryCount) {
      targetRoutingKey = emailWorkerRetry3;
    } else {
      // 3. Max retries reached - send to Dead Letter Queue
      targetRoutingKey = emailWorkerDLQ;
    }

    // 4. Publish the message with the updated header
    retryCount++;
    const updatedHeaders = {
      ...rawMsg.properties.headers,
      'x-retry-count': retryCount
    };

    channel.publish(emailDLXExchange.name, targetRoutingKey, content, {
      headers: updatedHeaders,
      persistent: true
    });
  }

  async consume(): Promise<void> {
    if (
      this.status === WorkerStatus.IN_PROGRESS ||
      this.status === WorkerStatus.CONSUMING
    ) {
      return;
    }
    await this.consumer.initialize(ChannelNames.EmailNotificationConsumer);
    this.channel = await this.consumer.selectChannel({
      channelName: ChannelNames.EmailNotificationConsumer
    });
    await this.assertDLX();
    await this.assertRetryQueues();
    this.channel.prefetch(1);

    try {
      this.status = WorkerStatus.IN_PROGRESS;
      await this.consumer.consume({
        messageHandler: this.handleMsg.bind(this),
        channelName: ChannelNames.EmailNotificationConsumer
      });
      this.status = WorkerStatus.CONSUMING;
    } catch (error) {
      this.status = WorkerStatus.IDLE;
    }
  }

  async assertDLX() {
    const { exchange, queue } = this.config;
    const { emailDLXExchange } = exchange;
    const { emailDLQ } = queue;
    try {
      await this.channel?.assertExchange(
        emailDLXExchange.name,
        emailDLXExchange.type,
        emailDLXExchange.options
      );

      await this.channel?.assertQueue(emailDLQ.name, emailDLQ.options);

      await this.channel?.bindQueue(
        emailDLQ.name,
        emailDLXExchange.name,
        RoutingKeys.emailWorkerDLQ
      );
    } catch (error) {
      const err = error instanceof Error ? error.message : error;
      logger.error(
        'Error occured while asserting DLX for the notification consumer',
        err
      );
      throw error;
    }
  }

  async assertRetryQueues() {
    const { exchange, queue } = this.config;

    const { emailRetry1, emailRetry2, emailRetry3 } = queue;

    const { emailWorkerRetry1, emailWorkerRetry2, emailWorkerRetry3 } =
      RoutingKeys;

    const { emailDLXExchange } = exchange;

    const retryList = [
      { queue: emailRetry1, binding: emailWorkerRetry1 },
      { queue: emailRetry2, binding: emailWorkerRetry2 },
      { queue: emailRetry3, binding: emailWorkerRetry3 }
    ];

    for (let elem of retryList) {
      try {
        await this.channel?.assertQueue(elem.queue.name, elem.queue.options);

        await this.channel?.bindQueue(
          elem.queue.name,
          emailDLXExchange.name,
          elem.binding
        );
      } catch (error) {
        const err = error instanceof Error ? error.message : error;
        logger.error(
          `Error while asserting the retry queue, in email worker ${elem.queue.name}: `,
          err
        );
        throw error;
      }
    }
  }
  private scheduleResume(reason: string) {
    this.status = WorkerStatus.IN_PROGRESS;
    logger.info(`Resuming email consumer: ${reason}`);
    this.consume().catch((err) => {
      logger.error('Resume failed:', err);
    });
  }

  private async scheduleHealthPolling(initialDelayMs = 60000) {
    // 1min
    const poll = async (delayMs: number) => {
      const resp = await this.EmailService.healthCheck(); // nodemailer.verify()

      if (resp) {
        this.scheduleResume('HEALTH_RESTORED');
      } else {
        const nextDelay = Math.min(delayMs * 3, 3600000);
        const timer = setTimeout(() => poll(nextDelay), nextDelay);
        this.timers.push(timer);
      }
    };
    poll(initialDelayMs);
  }

  async close(): Promise<void> {
    this.timers.forEach(clearTimeout); // clearing all the timers before closing the consumer instance
    await this.consumer.close({
      channelName: ChannelNames.EmailNotificationConsumer
    });
  }
}

export default EmailConusmer;
