import { RoutingKeys } from '../infrastructure/rabbitMQ/routingKeys';
import { parseDurationToMillis } from '../utils/helper';
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
    },
    notifDLXExchange: {
      name: process.env['RABBITMQ_NOTIF_DLX'] || 'notif_dlx_exchange',
      type: 'topic',
      options: {
        durable: true,
        autodelete: false
      }
    },
    deliveryExchange: {
      name: process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
      type: 'topic',
      options: {
        durable: true,
        autodelete: false
      }
    },
    emailDLXExchange: {
      name: process.env['RABBITMQ_EMAIL_DLX'] || 'email_dlx_exchange',
      type: 'topic',
      options: {
        durable: true,
        autodelete: false
      },
      maxRetryCount: 4
    },
    pushNotifDLXExchange: {
      name: process.env['RABBITMQ_PUSH_DLX'] || 'push_dlx_exchange',
      type: 'topic',
      options: {
        durable: true,
        autodelete: false
      },
      maxRetryCount: 4
    }
  },
  queue: {
    notifQueue: {
      name: process.env['RABBITMQ_QUEUE_NAME'] || 'notif_queue',
      options: {
        durable: true,
        autodelete: false
      }
    },
    notifDLQ: {
      name: process.env['RABBITMQ_NOTIF_DLQ'] || 'notif_dlq',
      options: {
        durable: true,
        autodelete: false
      }
    },
    emailDeliveryQueue: {
      name:
        process.env['RABBITMQ_EMAIL_DELIVERY_QUEUE'] || 'email_delivery_queue',
      options: {
        durable: true,
        autodelete: false
      }
    },

    emailDLQ: {
      name: process.env['RABBITMQ_EMAIL_DLQ'] || 'email_dlq',
      options: {
        durable: true,
        autodelete: false
      }
    },
    emailRetry1: {
      name: process.env['RABBITMQ_EMAIL_RETRY_1'] || 'email_retry_1',
      options: {
        durable: true,
        autodelete: false,
        arguments: {
          'x-message-ttl': parseDurationToMillis(
            `${process.env['RABBITMQ_EMAIL_RETRY_DELAY_FACTOR_MIN'] ?? 5}m`
          ),
          'x-dead-letter-exchange':
            process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
          'x-dead-letter-routing-key': RoutingKeys.emailNotifDeliveryRoute
        }
      }
    },
    emailRetry2: {
      name: process.env['RABBITMQ_EMAIL_RETRY_2'] || 'email_retry_2',
      options: {
        durable: true,
        autodelete: false,
        arguments: {
          'x-message-ttl': parseDurationToMillis(
            `${(Number(process.env['RABBITMQ_EMAIL_RETRY_DELAY_FACTOR_MIN']) ?? 5) * 3}m`
          ),
          'x-dead-letter-exchange':
            process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
          'x-dead-letter-routing-key': RoutingKeys.emailNotifDeliveryRoute
        }
      }
    },
    emailRetry3: {
      name: process.env['RABBITMQ_EMAIL_RETRY_3'] || 'email_retry_3',
      options: {
        durable: true,
        autodelete: false,
        arguments: {
          'x-message-ttl': parseDurationToMillis(
            `${(Number(process.env['RABBITMQ_EMAIL_RETRY_DELAY_FACTOR_MIN']) ?? 5) * 12}m`
          ),
          'x-dead-letter-exchange':
            process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
          'x-dead-letter-routing-key': RoutingKeys.emailNotifDeliveryRoute
        }
      }
    },

    pushDeliveryQueue: {
      name:
        process.env['RABBITMQ_PUSH_DELIVERY_QUEUE'] || 'push_delivery_queue',
      options: {
        durable: true,
        autodelete: false
      }
    },
    pushNotifDLQ: {
      name: process.env['RABBITMQ_PUSH_DLQ'] || 'push_dlq',
      options: {
        durable: true,
        autodelete: false
      }
    },
    pushNotifRetry1: {
      name: process.env['RABBITMQ_PUSH_RETRY_1'] || 'push_retry_1',
      options: {
        durable: true,
        autodelete: false,
        arguments: {
          'x-message-ttl': parseDurationToMillis(
            `${process.env['RABBITMQ_PUSH_RETRY_DELAY_FACTOR_MIN'] ?? 2}m`
          ),
          'x-dead-letter-exchange':
            process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
          'x-dead-letter-routing-key': RoutingKeys.pushNotifDeliveryRoute
        }
      }
    },
    pushNotifRetry2: {
      name: process.env['RABBITMQ_PUSH_RETRY_2'] || 'push_retry_2',
      options: {
        durable: true,
        autodelete: false,
        arguments: {
          'x-message-ttl': parseDurationToMillis(
            `${(Number(process.env['RABBITMQ_PUSH_RETRY_DELAY_FACTOR_MIN']) ?? 2) * 2}m`
          ),
          'x-dead-letter-exchange':
            process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
          'x-dead-letter-routing-key': RoutingKeys.pushNotifDeliveryRoute
        }
      }
    },
    pushNotifRetry3: {
      name: process.env['RABBITMQ_PUSH_RETRY_3'] || 'push_retry_3',
      options: {
        durable: true,
        autodelete: false,
        arguments: {
          'x-message-ttl': parseDurationToMillis(
            `${(Number(process.env['RABBITMQ_PUSH_RETRY_DELAY_FACTOR_MIN']) ?? 2) * 3}m`
          ),
          'x-dead-letter-exchange':
            process.env['RABBITMQ_DELIVERY_EXCHANGE'] || 'delivery_exchange',
          'x-dead-letter-routing-key': RoutingKeys.pushNotifDeliveryRoute
        }
      }
    }
  },
  messageOptions: {
    persistent: true
  }
};
