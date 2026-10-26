import {
  DeliveryEventBus,
  NotificationConusmer,
  EmailConusmer,
  PushNotifConusmer
} from './rabbitMQ/rabbitMQEventBus';

import Publisher from './rabbitMQ/publisher';
import config from '../config/rabbitMQ';
import Consumer from './rabbitMQ/consumer';
import { RoutingKeys } from './rabbitMQ/routingKeys';

const { deliveryExchange, notifExchange } = config.exchange;
const { notifQueue, emailDeliveryQueue, pushDeliveryQueue } = config.queue;
const publisher = new Publisher({
  exchangeName: deliveryExchange.name,
  exchangeType: deliveryExchange.type,
  exchangeOptions: deliveryExchange.options
});

const appNotifConsumer = new Consumer({
  exchangeName: notifExchange.name,
  exchangeType: notifExchange.type,
  exchangeOptions: notifExchange.options,
  queueName: notifQueue.name,
  queueOptions: notifQueue.options,
  bindingKey: RoutingKeys.AppNotificationConsumer
});

const emailNotifConsumer = new Consumer({
  exchangeName: deliveryExchange.name,
  exchangeType: deliveryExchange.type,
  exchangeOptions: deliveryExchange.options,
  queueName: emailDeliveryQueue.name,
  queueOptions: emailDeliveryQueue.options,
  bindingKey: RoutingKeys.emailNotifDeliveryRoute
});

const pushNotifConsumer = new Consumer({
  exchangeName: deliveryExchange.name,
  exchangeType: deliveryExchange.type,
  exchangeOptions: deliveryExchange.options,
  queueName: pushDeliveryQueue.name,
  queueOptions: pushDeliveryQueue.options,
  bindingKey: RoutingKeys.pushNotifDeliveryRoute
});

const eventBus = {
  notificationDeliveryPub: new DeliveryEventBus(publisher),
  notificationIngestSub: new NotificationConusmer(appNotifConsumer),
  emailNotificationSub: new EmailConusmer(emailNotifConsumer),
  pushNotificationSub: new PushNotifConusmer(pushNotifConsumer)
};

export default eventBus;
