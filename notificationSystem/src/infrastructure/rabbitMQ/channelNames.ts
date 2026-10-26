// channelNames.ts
export enum ChannelNames {
  DeliveryPublisher = 'publisher:rabbitmq-delivery',
  AppNotificationConsumer = 'consumer:app-notification',
  EmailNotificationConsumer = 'consumer:email-notification',
  PushNotificationConsumer = 'consumer:push-notification'
}
