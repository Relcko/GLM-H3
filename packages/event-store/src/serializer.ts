import type { EventEnvelope } from '@relcko/events';

/**
 * Storage-ready serialized form of an event envelope.
 */
export interface SerializedEvent {
  /** Event type name from the Domain Event Catalog. */
  readonly eventType: string;
  /** Schema version of the event payload. */
  readonly eventVersion: number;
  /** Serialized event payload. */
  readonly data: string;
  /** Serialized event metadata. */
  readonly metadata: string;
}

/**
 * Converts event envelopes into their storage representation.
 * Implementations must be deterministic: the same envelope always produces
 * the same serialized output (Playbook 2.6).
 */
export interface EventSerializer {
  /**
   * Serializes an event envelope.
   *
   * @param envelope - envelope to serialize
   * @returns storage-ready serialized event
   * @throws {EventSerializationError} when the envelope cannot be serialized
   */
  serialize(envelope: EventEnvelope): SerializedEvent;
}

/**
 * Restores event envelopes from their storage representation.
 */
export interface EventDeserializer {
  /**
   * Deserializes a stored event back into an envelope.
   *
   * @param event - serialized event as read from the store
   * @returns the restored event envelope
   * @throws {EventSerializationError} when the payload cannot be deserialized
   */
  deserialize(event: SerializedEvent): EventEnvelope;
}
