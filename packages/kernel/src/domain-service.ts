import type { Clock } from './clock';
import type { Logger } from '@relcko/logger';


/**
 * Infrastructure context handed to every domain service.
 */
export interface DomainServiceContext {
  /** Structured logger (Playbook 8.5). */
  readonly logger: Logger;
  /** Clock abstraction (Playbook 2.6). */
  readonly clock: Clock;
}

/**
 * Base class for domain services.
 *
 * Domain services hold domain logic that does not naturally belong to a
 * single aggregate or value object. They carry no infrastructure state of
 * their own; cross-cutting needs arrive through {@link DomainServiceContext}.
 */
export abstract class DomainService {
  /** Structured logger scoped to the concrete service name. */
  protected readonly logger: Logger;
  /** Clock abstraction for deterministic time access. */
  protected readonly clock: Clock;

  /**
   * @param context - shared infrastructure context
   */
  constructor(context: DomainServiceContext) {
    this.logger = context.logger.child(this.constructor.name);
    this.clock = context.clock;
  }
}
