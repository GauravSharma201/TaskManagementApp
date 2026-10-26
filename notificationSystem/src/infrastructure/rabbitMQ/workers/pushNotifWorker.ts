import Consumer from '../consumer';
import amqp from 'amqplib';
import config from '../../../config/rabbitMQ';
import { DomainEvent } from '../../../domain/events/domainEvents';
import { IdempotencyStoreService } from '../../../services/index';
// import NotificationIngestHandler from "@/handlers/notificationIngestHandler";
import { RoutingKeys } from '../routingKeys';
import { ChannelNames } from '../channelNames';
import logger from '../../../utils/logger';

class PushNotifConusmer {
  private consumer: Consumer;
  private channel: amqp.Channel | null;
  private config: typeof config;

  constructor(consumer: Consumer) {
    this.consumer = consumer;
    this.channel = null;
    this.config = config;
  }

  async handleMsg(
    parsedMsg: DomainEvent,
    rawMsg: amqp.Message,
    channel: amqp.Channel
  ) {
    // checking for duplicate events at the inbound layer...
    const check = await IdempotencyStoreService.getEvent(
      parsedMsg.payload?.eventId
    );
    if (check) {
      channel.ack(rawMsg);
      return;
    }
    // const consumeRes = await NotificationIngestHandler(parsedMsg, rawMsg);
    // we can handle the message acknowledgement here...
    // switch (consumeRes) {
    //   case ConsumeOutcome.Ack:
    //     channel.ack(rawMsg);
    //     break;

    //   case ConsumeOutcome.RETRY:
    //     // requeuing to the same queue...
    //     const redelivered = rawMsg.fields.redelivered;
    //     if (redelivered) {
    //       this.publishToDLQ(channel, parsedMsg);
    //       channel.reject(rawMsg, false); // send to DLQ return;
    //     } else {
    //       channel.nack(rawMsg, false);
    //     }

    //     break;

    //   case ConsumeOutcome.REJECT:
    //     this.publishToDLQ(channel, parsedMsg);
    //     channel.reject(rawMsg, false);
    //     break;

    //   default:
    //     this.publishToDLQ(channel, parsedMsg);
    //     channel.reject(rawMsg, false);
    //     break;
    // }
  }

  publishToDLQ(channel: amqp.Channel, parsedMsg: DomainEvent) {
    const content = Buffer.from(
      typeof parsedMsg === 'object' ? JSON.stringify(parsedMsg) : parsedMsg
    );
    channel.publish(
      this.config.exchange.pushNotifDLXExchange.name,
      RoutingKeys.pushNotifWorkerDLQ,
      content
    );
  }

  async consume(): Promise<void> {
    await this.consumer.initialize(ChannelNames.PushNotificationConsumer);
    this.channel = await this.consumer.selectChannel({
      channelName: ChannelNames.PushNotificationConsumer
    });
    await this.assertDLX();
    await this.assertRetryQueues();
    await this.consumer.consume({
      messageHandler: this.handleMsg.bind(this),
      channelName: ChannelNames.PushNotificationConsumer
    });
  }

  async assertDLX() {
    const { exchange, queue } = this.config;
    const { pushNotifDLXExchange } = exchange;
    const { pushNotifDLQ } = queue;
    try {
      await this.channel?.assertExchange(
        pushNotifDLXExchange.name,
        pushNotifDLXExchange.type,
        pushNotifDLXExchange.options
      );

      await this.channel?.assertQueue(pushNotifDLQ.name, pushNotifDLQ.options);

      await this.channel?.bindQueue(
        pushNotifDLQ.name,
        pushNotifDLXExchange.name,
        RoutingKeys.pushNotifWorkerDLQ
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

    const { pushNotifRetry1, pushNotifRetry2, pushNotifRetry3 } = queue;

    const { pushWorkerRetry1, pushWorkerRetry2, pushWorkerRetry3 } =
      RoutingKeys;

    const { pushNotifDLXExchange } = exchange;

    const retryList = [
      { queue: pushNotifRetry1, binding: pushWorkerRetry1 },
      { queue: pushNotifRetry2, binding: pushWorkerRetry2 },
      { queue: pushNotifRetry3, binding: pushWorkerRetry3 }
    ];

    for (let elem of retryList) {
      try {
        await this.channel?.assertQueue(elem.queue.name, elem.queue.options);

        await this.channel?.bindQueue(
          elem.queue.name,
          pushNotifDLXExchange.name,
          elem.binding
        );
      } catch (error) {
        const err = error instanceof Error ? error.message : error;
        logger.error(
          `Error while asserting the retry queue, in push notification worker ${elem.queue.name}: `,
          err
        );
        throw error;
      }
    }
  }

  async close(): Promise<void> {
    await this.consumer.close({
      channelName: ChannelNames.PushNotificationConsumer
    });
  }
}

export default PushNotifConusmer;
