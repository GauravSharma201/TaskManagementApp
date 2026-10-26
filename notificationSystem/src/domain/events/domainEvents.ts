// domain/events/DomainEvent.ts
export interface DomainEvent<T = any> {
  type: string; // e.g. "user.created"
  payload: T; // event-specific data
  routingKey: string; // RabbitMQ routing key
  timestamp: Date; // optional, for auditing
}
