import type { EventSerializer, EventDeserializer, SerializedEvent } from "@relcko/event-store";
import type { EventEnvelope, EventMetadata } from "@relcko/events";
import { bigintReplacer, bigintReviver } from "./bigint-json";

export class BigIntJsonSerializer implements EventSerializer, EventDeserializer {
  serialize(envelope: EventEnvelope): SerializedEvent {
    return {
      eventType: envelope.metadata.eventType,
      eventVersion: envelope.metadata.eventVersion,
      data: JSON.stringify(envelope.payload, bigintReplacer),
      metadata: JSON.stringify(envelope.metadata, bigintReplacer),
    };
  }

  deserialize(event: SerializedEvent): EventEnvelope {
    return {
      metadata: JSON.parse(event.metadata, bigintReviver) as EventMetadata,
      payload: JSON.parse(event.data, bigintReviver) as unknown,
    };
  }
}
