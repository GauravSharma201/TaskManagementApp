import { NotificationEventBus } from './rabbitMQ/rabbitMQEventBus';
import Publisher from './rabbitMQ/publisher';
import config from '../config/rabbitMQ';
const { notifExchange } = config.exchange;
const publisher = new Publisher({
  exchangeName: notifExchange.name,
  exchangeType: notifExchange.type,
  exchangeOptions: notifExchange.options
});
const notification = new NotificationEventBus(publisher);
const eventBus = { notification };

export default eventBus;
