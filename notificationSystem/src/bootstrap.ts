import eventBus from './infrastructure/eventBus';
import logger from './utils/logger';

async function consume() {
  const consumerType = process.env['CONSUMER_TYPE'];

  switch (consumerType) {
    case 'notif_ingest':
      logger.info('Starting notification ingest consumer...');
      await eventBus.notificationIngestSub.consume();
      break;

    default:
      logger.error(`Unknown CONSUMER_TYPE: ${consumerType}`);
      process.exit(1);
  }
}

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Closing RabbitMQ connections...`);
    try {
      // Close connections/channels here if your consumer exposes a close method
      await eventBus.notificationIngestSub?.close?.();
    } catch (err) {
      logger.error('Error during shutdown:', err);
    } finally {
      logger.info('Shutdown complete. Exiting process.');
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

consume();
setupGracefulShutdown();
