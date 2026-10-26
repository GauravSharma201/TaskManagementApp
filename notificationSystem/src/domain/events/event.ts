import { DomainEvent } from './domainEvents';

// domain/events/EventBus.ts
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}
