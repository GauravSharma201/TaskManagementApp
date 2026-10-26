import dotenv from 'dotenv';

dotenv.config();

export default {
  connection: {
    protocol: process.env['RABBITMQ_PROTOCOL'] || 'amqp',
    hostname: process.env['RABBITMQ_HOSTNAME'] || 'localhost',
    port: process.env['RABBITMQ_PORT']
      ? parseInt(process.env['RABBITMQ_PORT'])
      : 5672,
    username: process.env['RABBITMQ_USERNAME'] || 'guest',
    password: process.env['RABBITMQ_PASSWORD'] || 'guest',
    vhost: process.env['RABBITMQ_VHOST'] || '/',
    reconnectInterval: parseInt(
      process.env['RABBITMQ_RECONNECT_INTERVAL'] || '5000',
      10
    ),
    reconnectAttempts: parseInt(
      process.env['RABBITMQ_RECONNECT_ATTEMPTS'] || '10',
      10
    )
  },
  exchange: {
    notifExchange: {
      name: process.env['RABBITMQ_EXCHANGE_NAME'] || 'notif_exchange',
      type: 'topic',
      options: {
        durable: true,
        autodelete: false
      }
    }
  },
  queue: {
    notifQueue: {
      name: process.env['RABBITMQ_QUEUE_NAME'] || 'notif_queue',
      options: {
        durable: true,
        autodelete: false
      }
    }
  },
  messageOptions: {
    persistent: true
  }
};
