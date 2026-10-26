import config from '../../config/rabbitMQ';
import amqp, { Channel } from 'amqplib';
import logger from '@/utils/logger';
import RabbitMqConnection from './connection';
import { DomainEvent } from '../../domain/events/domainEvents';

class Publisher {
  private config: typeof config;
  private messageOptions: amqp.Options.Publish;
  private defaultRoutingKey: string;
  private exchangeName: string;
  private exchangeType: string;
  private exchangeOptions: amqp.Options.AssertExchange;

  constructor({
    exchangeName,
    exchangeOptions, // use config options at the time of creating an instance
    exchangeType
  }: {
    exchangeName: string;
    exchangeType: string;
    exchangeOptions: amqp.Options.AssertExchange;
  }) {
    this.config = config;
    this.messageOptions = this.config.messageOptions;
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.exchangeOptions = exchangeOptions;
    this.defaultRoutingKey = '';
  }

  async initialize({ nameKey = '' }: { nameKey: string }): Promise<void> {
    try {
      const channel = await this.selectChannel({ channelName: nameKey });

      logger.info(`Asserting exchange: ${this.exchangeName}...`);
      await channel.assertExchange(
        this.exchangeName,
        this.exchangeType,
        this.exchangeOptions
      );
      logger.info(
        `Publisher initialized: Exchange '${this.exchangeName}' (${this.exchangeType}) created/verified`
      );
    } catch (error) {
      logger.error('Failed to initialize publisher:', error);
      throw error;
    }
  }

  async selectChannel({
    channelName = ''
  }: {
    channelName: string;
  }): Promise<Channel> {
    let channel = RabbitMqConnection.getChannelByName({
      nameKey: channelName
    });
    if (!channel) {
      channel = await RabbitMqConnection.createChannel({
        nameKey: channelName,
        confirm: true
      });
    }

    return channel;
  }

  async publish({
    message,
    routingKey = this.defaultRoutingKey,
    nameKey = '',
    options = {}
  }: {
    message: DomainEvent;
    routingKey: string;
    nameKey: string;
    options?: amqp.Options.Publish;
  }) {
    try {
      const channel = await this.selectChannel({ channelName: nameKey });

      await channel.assertExchange(
        this.exchangeName,
        this.exchangeType,
        this.exchangeOptions
      );

      const content = Buffer.from(
        typeof message === 'object' ? JSON.stringify(message) : message
      );

      channel.publish(this.exchangeName, routingKey, content, {
        ...this.messageOptions,
        ...options
      });

      await (channel as amqp.ConfirmChannel).waitForConfirms();

      logger.info(
        `Message published to exchange '${this.exchangeName}' with routing key '${routingKey}'`
      );

      return true;
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async close({ channelName = '' }: { channelName: string }) {
    await RabbitMqConnection.closeChannelByName({ nameKey: channelName });
  }
}

export default Publisher;
