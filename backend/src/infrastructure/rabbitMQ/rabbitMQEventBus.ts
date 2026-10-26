// infrastructure/rabbitmq/RabbitMqEventBus.ts
import { EventBus } from '../../domain/events/event';
import { DomainEvent } from '../../domain/events/domainEvents';
import Publisher from './publisher';
import { ChannelNames } from './channelNames';
import crypto from 'crypto';

export class NotificationEventBus implements EventBus {
  private publisher: Publisher;

  constructor(publisher: Publisher) {
    this.publisher = publisher;
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventObj = { eventId: this.generateEventId(), ...event };
    await this.publisher.publish({
      message: eventObj,
      nameKey: ChannelNames.Publisher,
      routingKey: event.routingKey
    });
  }

  generateEventId() {
    return 'evt_' + crypto.randomBytes(8).toString('hex');
  }
}
