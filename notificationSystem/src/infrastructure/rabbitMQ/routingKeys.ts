// channelNames.ts
export enum RoutingKeys {
  AppNotificationConsumer = '#',
  appNotifDLQ = 'notif.ingest.dql',
  emailNotifDeliveryRoute = 'route.email',
  emailWorkerDLQ = 'email.worker.dql',
  emailWorkerRetry1 = 'email.worker.retry1',
  emailWorkerRetry2 = 'email.worker.retry2',
  emailWorkerRetry3 = 'email.worker.retry3',
  pushNotifWorkerDLQ = 'push.worker.dql',
  pushWorkerRetry1 = 'push.worker.retry1',
  pushWorkerRetry2 = 'push.worker.retry2',
  pushWorkerRetry3 = 'push.worker.retry3',
  pushNotifDeliveryRoute = 'route.push'
}
