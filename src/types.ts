export enum KafkaEventType {
  TextLinkCreated = 'TEXT_LINK_CREATED',
  TextLinkDeleted = 'TEXT_LINK_DELETED',
}

export interface KafkaBaseEvent {
  eventType: KafkaEventType;
  eventVersion: string;
}
