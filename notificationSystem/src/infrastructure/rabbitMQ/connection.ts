import amqp, { ChannelModel, Channel } from 'amqplib';
import config from '../../config/rabbitMQ';
import logger from '../../utils/logger';

class RabbitMqConnection {
  private connection: ChannelModel | null;
  private isConnecting: boolean;
  private channel: Map<string, Channel>;
  private confirmChannel: Map<string, Channel>;
  private connectionRetries: number;
  private config: typeof config;

  constructor() {
    this.connection = null;
    this.isConnecting = false;
    this.channel = new Map<string, Channel>();
    this.confirmChannel = new Map<string, Channel>();
    this.connectionRetries = 0;
    this.config = config;
  }

  async connect(): Promise<ChannelModel> {
    if (this.connection) {
      return this.connection;
    }

    if (this.isConnecting) {
      await new Promise((res, _rej) => {
        const checkConnection = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkConnection);
            res(true);
          }
        }, 100);
      });
      return this.connection!;
    }

    this.isConnecting = true;

    try {
      const { hostname, port, username, password, protocol, vhost } =
        this.config.connection;
      const connectionString = `${protocol}://${username}:${password}@${hostname}:${port}${vhost}`;

      logger.info(`connecting to RabbitMQ at: ${hostname}:${port}...`);
      this.connection = await amqp.connect(connectionString);

      this.connectionRetries = 0;
      logger.info('RabbitMQ connected successfully.');

      this.connection?.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.handleConnectionError();
      });

      this.connection?.on('close', async () => {
        logger.warn('RabbitMQ connection closed.');
        this.handleConnectionError();
      });

      return this.connection;
    } catch (error) {
      logger.error('RabbitMQ connection failed:', error);
      this.handleConnectionError();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  handleConnectionError() {
    this.connection = null;
    this.channel.clear();
    this.confirmChannel.clear();

    if (this.connectionRetries < this.config.connection.reconnectAttempts) {
      const delay = this.config.connection.reconnectInterval;
      this.connectionRetries += 1;

      logger.info(
        `Attempting to reconnect to RabbitMQ in ${delay} ms (Attempt ${this.connectionRetries}/${this.config.connection.reconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((err) => {
          logger.error('Reconnection attempt failed:', err);
        });
      }, delay);
    } else {
      logger.error(
        `Max reconnection attempts (${this.config.connection.reconnectAttempts}) reached. Giving up.`
      );
    }
  }

  getChannelByName({ nameKey = '' }: { nameKey: string }) {
    const existingChannel = this.confirmChannel.has(nameKey)
      ? this.confirmChannel.get(nameKey)
      : this.channel.get(nameKey);

    if (!existingChannel) {
      return null;
    }
    return existingChannel;
  }

  async createChannel({
    nameKey = '',
    confirm = false
  }: {
    confirm?: boolean;
    nameKey?: string;
  }): Promise<Channel> {
    try {
      const connection = await this.connect();
      let channel;
      if (confirm) {
        channel = await connection.createConfirmChannel();
        logger.info('RabbitMQ confirm channel created successfully.');
        this.confirmChannel.set(nameKey, channel);
      } else {
        channel = await connection.createChannel();
        logger.info('RabbitMQ channel created successfully.');
        this.channel.set(nameKey, channel);
      }

      channel.on('error', (err) => {
        logger.error('RabbitMQ channel error:', err);
        if (confirm) {
          this.confirmChannel.delete(nameKey);
        } else {
          this.channel.delete(nameKey);
        }
      });

      channel.on('close', () => {
        logger.warn('RabbitMQ channel closed.');
        if (confirm) {
          this.confirmChannel.delete(nameKey);
        } else {
          this.channel.delete(nameKey);
        }
      });

      return channel;
    } catch (error) {
      logger.error('Failed to create RabbitMQ channel:', error);
      if (confirm) {
        this.confirmChannel.delete(nameKey);
      } else {
        this.channel.delete(nameKey);
      }

      throw error;
    }
  }

  async close() {
    try {
      await this.closeChannels();
      await this.closeAllConfirmChannels();
      if (this.connection) {
        logger.info('Closing RabbitMQ connection...');
        await this.connection.close();
        this.connection = null;
      }
      logger.info('RabbitMQ connection and channel closed successfully.');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : new Error(String(error));
      logger.error(`Error while closing RabbitMQ connections: ${errorMessage}`);
      this.connection = null;
      this.channel.clear();
      this.confirmChannel.clear();
    }
  }

  async closeChannelByName({ nameKey = '' }) {
    try {
      if (this.channel.has(nameKey)) {
        const channel = this.channel.get(nameKey);
        await channel?.close();
        this.channel.delete(nameKey);
        logger.info('RabbitMQ channel closed successfully.');
      } else if (this.confirmChannel.has(nameKey)) {
        const channel = this.confirmChannel.get(nameKey);
        await channel?.close();
        this.confirmChannel.delete(nameKey);
        logger.info('RabbitMQ channel closed successfully.');
      } else {
        logger.info(`No channel found with the name '${nameKey}' to close.`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : new Error(String(error));
      logger.error(`Error while closing RabbitMQ connections: ${errorMessage}`);
      this.channel.delete(nameKey);
      this.confirmChannel.delete(nameKey);
    }
  }

  private async closeAllConfirmChannels() {
    for (const [key, channel] of this.confirmChannel.entries()) {
      try {
        await channel.close();
      } catch (error) {
        logger.error(`Error closing confirm channel ${key}:`, error);
      }
    }
    this.confirmChannel.clear();
  }

  private async closeChannels() {
    for (const [key, channel] of this.channel.entries()) {
      try {
        await channel.close();
      } catch (error) {
        logger.error(`Error closing confirm channel ${key}:`, error);
      }
    }
    this.channel.clear();
  }
}

export default new RabbitMqConnection();
