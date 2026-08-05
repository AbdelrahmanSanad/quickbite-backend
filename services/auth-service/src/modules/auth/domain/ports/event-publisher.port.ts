/**
 * Publishes domain events. In-process (EventEmitter) today; swapping to
 * RabbitMQ is a single adapter change behind this interface.
 */
export interface DomainEventPublisher {
  publish(eventName: string, payload: object): void;
}

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
