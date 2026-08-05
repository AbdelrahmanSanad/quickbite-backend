import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventPublisher } from '../../domain/ports/event-publisher.port';

/** In-process domain event publisher backed by Nest's EventEmitter2. */
@Injectable()
export class EventEmitterPublisher implements DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(eventName: string, payload: object): void {
    this.emitter.emit(eventName, payload);
  }
}
