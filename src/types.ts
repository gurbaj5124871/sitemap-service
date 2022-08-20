export enum KafkaEventType {
  TextLinkCreated = 'TEXT_LINK_CREATED',
  TextLinkDeleted = 'TEXT_LINK_DELETED',

  VideoLinkCreated = 'VIDEO_LINK_CREATED',
  VideoLinkUpdated = 'VIDEO_LINK_UPDATED',
  VideoLinkDeleted = 'VIDEO_LINK_DELETED',
}

export interface KafkaBaseEvent {
  eventType: KafkaEventType;
  eventVersion: string;
}
