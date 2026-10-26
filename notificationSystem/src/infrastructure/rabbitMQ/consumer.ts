import logger from '../../utils/logger';
import RabbitMqConnection from './connection';
import amqp, { Channel } from 'amqplib';
import { DomainEvent } from '../../domain/events/domainEvents';

class Consumer {
  private exchangeName: string;
  private exchangeType: string;
  private exchangeOptions: amqp.Options.AssertExchange;
  private queueName: string;
  private queueOptions: amqp.Options.AssertQueue;
  private bindingKey: string;
  private consumerTag: string | null;

  constructor({
    exchangeName,
    exchangeType,
    exchangeOptions,
    queueName,
    bindingKey,
    queueOptions
  }: {
    exchangeName: string;
    exchangeType: string;
    bindingKey: string;
    exchangeOptions: amqp.Options.AssertExchange; // use config options at the time of creating an instance
    queueName: string;
    queueOptions: amqp.Options.AssertQueue; // use config options at the time of creating an instance
  }) {
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.exchangeOptions = exchangeOptions;
    this.queueName = queueName;
    this.queueOptions = queueOptions;
    this.bindingKey = bindingKey || '#';
    this.consumerTag = null;
  }

  async initialize(nameKey: string): Promise<void> {
    try {
      const channel = await this.selectChannel({ channelName: nameKey });

      logger.info(`Asserting exchange: ${this.exchangeName}...`);
      await channel.assertExchange(
        this.exchangeName,
        this.exchangeType,
        this.exchangeOptions
      );

      logger.info(`Asserting queue: ${this.queueName}...`);
      await channel.assertQueue(this.queueName, this.queueOptions);

      logger.info('Binding queue to exchange...');
      await channel.bindQueue(
        this.queueName,
        this.exchangeName,
        this.bindingKey
      );

      logger.info(
        `Consumer initialized: Queue '${this.queueName}' bound to Exchange '${this.exchangeName}'`
      );
    } catch (error) {
      logger.error('Error initializing consumer:', error);
      throw error;
    }
  }

  getExchangeName() {
    return this.exchangeName;
  }

  getRoutingKey() {
    return this.bindingKey;
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
        nameKey: channelName
      });
    }

    return channel;
  }

  async consume({
    channelName,
    messageHandler,
    options
  }: {
    channelName: string;
    messageHandler: (
      parsed: DomainEvent,
      rawMsg: amqp.Message,
      channel: amqp.Channel
    ) => Promise<void>;
    options?: amqp.Options.Consume;
  }): Promise<string> {
    try {
      const channel = await this.selectChannel({ channelName });
      const consumeOptions = {
        noAck: false, // manual acknowledgment
        ...options
      };

      const { consumerTag } = await channel.consume(
        this.queueName,
        async (msg) => {
          if (!msg) {
            logger.warn('Received null message, consumer was likely canceled');
            return;
          }

          try {
            // Parse message content
            const content = msg.content.toString();
            let parsedContent;

            try {
              parsedContent = JSON.parse(content);
            } catch (err) {
              parsedContent = content;
            }

            logger.debug(
              `Received message from queue '${this.queueName}': ${content}`
            );

            // Process message with handler
            await messageHandler(parsedContent, msg, channel);
          } catch (error) {
            logger.error('Error processing message:', error);

            if (!consumeOptions.noAck) {
              channel.reject(msg, false); // reject and do not requeue, to avoid poison messages
              logger.debug('Message rejected (not requeued)');
            }
          }
        },
        consumeOptions
      );

      this.consumerTag = consumerTag;
      logger.info(
        `Started consuming from queue '${this.queueName}' with consumer tag '${consumerTag}'`
      );

      return consumerTag;
    } catch (error) {
      logger.error('Error starting consumer:', error);
      throw error;
    }
  }

  async cancel({ channelName = '' }: { channelName: string }): Promise<void> {
    if (!this.consumerTag) {
      logger.warn('No active consumer to cancel');
      return;
    }

    try {
      const channel = RabbitMqConnection.getChannelByName({
        nameKey: channelName
      });
      if (!channel) {
        logger.error('No channel found with the provided name, to cancel.');
        throw new Error('No channel found with the provided name, to cancel.');
      }
      await channel.cancel(this.consumerTag as string);
      logger.info(`Consumer with tag '${this.consumerTag}' has been canceled`);
      this.consumerTag = null;
    } catch (error) {
      logger.error('Failed to cancel consumer:', error);
      throw error;
    }
  }

  async close({ channelName = '' }: { channelName: string }): Promise<void> {
    try {
      await this.cancel({ channelName });
      await RabbitMqConnection.closeChannelByName({ nameKey: channelName });
    } catch (error) {
      logger.error('Failed to close consumer:', error);
      throw error;
    }
  }
}

export default Consumer;
