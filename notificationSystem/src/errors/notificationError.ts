export abstract class NotificationError extends Error {
  abstract readonly retriable: boolean;
}

export class NonRetriableNotificationError extends NotificationError {
  readonly retriable = false;
}

export class RetriableNotificationError extends NotificationError {
  readonly retriable = true;
}
