import type { StreamId } from './stream-id';
import type { EventId } from '@relcko/types';


/**
 * Persisted representation of one event inside the store.
 *
 * The payload and metadata are stored in serialized form so the store stays
 * agnostic of event schemas; {@link EventSerializer} /
 * {@link EventDeserializer} perform the conversion at the boundary.
 */
export interface StoredEvent {
  /** Unique event identifier (matches the envelope metadata). */
  readonly eventId: EventId;
  /** Stream the event belongs to. */
  readonly streamId: StreamId;
  /** Per-stream position (1-based, gapless). */
  readonly version: number;
  /** Store-wide position (1-based, gapless, append order). */
  readonly globalPosition: number;
  /** Event type name from the Domain Event Catalog. */
  readonly eventType: string;
  /** Schema version of the event payload. */
  readonly eventVersion: number;
  /** Serialized event payload. */
  readonly data: string;
  /** Serialized event metadata. */
  readonly metadata: string;
  /** Epoch milliseconds when the store recorded the event. */
  readonly recordedAt: number;
}
