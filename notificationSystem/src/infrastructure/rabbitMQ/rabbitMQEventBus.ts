// infrastructure/rabbitmq/RabbitMqEventBus.ts
import { EventBus } from '../../domain/events/event';
import { DomainEvent } from '../../domain/events/domainEvents';
import Publisher from './publisher';
import Consumer from './consumer';
import { ChannelNames } from './channelNames';
import { ConsumeOutcome } from '../eventTypes';
import NotificationIngestHandler from '../../handlers/notificationIngestHandler';
import amqp from 'amqplib';
import config from '../../config/rabbitMQ';
import { RoutingKeys } from './routingKeys';
import logger from '../../utils/logger';
import IdempotencyStoreService from '../../services/idempotencyStoreService';
import EmailConusmer from './workers/emailWorker';
import PushNotifConusmer from './workers/pushNotifWorker';

class DeliveryEventBus implements EventBus {
  private publisher: Publisher;

  constructor(publisher: Publisher) {
    this.publisher = publisher;
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.publisher.publish({
      message: event,
      nameKey: ChannelNames.DeliveryPublisher,
      routingKey: event.routingKey
    });
  }
}

class NotificationConusmer {
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
    const consumeRes = await NotificationIngestHandler(parsedMsg, rawMsg);
    // we can handle the message acknowledgement here...
    switch (consumeRes) {
      case ConsumeOutcome.Ack:
        channel.ack(rawMsg);
        break;

      case ConsumeOutcome.RETRY:
        // requeuing to the same queue...
        const redelivered = rawMsg.fields.redelivered;
        if (redelivered) {
          this.publishToDLQ(channel, parsedMsg);
          channel.reject(rawMsg, false); // send to DLQ return;
        } else {
          channel.nack(rawMsg, false);
        }

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
  }

  publishToDLQ(channel: amqp.Channel, parsedMsg: DomainEvent) {
    const content = Buffer.from(
      typeof parsedMsg === 'object' ? JSON.stringify(parsedMsg) : parsedMsg
    );
    channel.publish(
      this.config.exchange.notifDLXExchange.name,
      RoutingKeys.appNotifDLQ,
      content
    );
  }

  async consume(): Promise<void> {
    await this.consumer.initialize(ChannelNames.AppNotificationConsumer);
    this.channel = await this.consumer.selectChannel({
      channelName: ChannelNames.AppNotificationConsumer
    });
    await this.assertDLX();
    this.channel.prefetch(1);
    await this.consumer.consume({
      messageHandler: this.handleMsg.bind(this),
      channelName: ChannelNames.AppNotificationConsumer
    });
  }

  async assertDLX() {
    const { exchange, queue } = this.config;
    const { notifDLXExchange } = exchange;
    const { notifDLQ } = queue;
    try {
      await this.channel?.assertExchange(
        notifDLXExchange.name,
        notifDLXExchange.type,
        notifDLXExchange.options
      );

      await this.channel?.assertQueue(notifDLQ.name, notifDLQ.options);

      await this.channel?.bindQueue(
        notifDLQ.name,
        notifDLXExchange.name,
        RoutingKeys.appNotifDLQ
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

  async close(): Promise<void> {
    await this.consumer.close({
      channelName: ChannelNames.AppNotificationConsumer
    });
  }
}

export {
  NotificationConusmer,
  DeliveryEventBus,
  EmailConusmer,
  PushNotifConusmer
};
