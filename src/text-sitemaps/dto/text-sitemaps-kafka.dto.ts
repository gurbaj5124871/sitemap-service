import { KafkaBaseEvent, KafkaEventType } from '../../types';

export interface KafkaSessionEventHeaders extends KafkaBaseEvent {
  eventType: KafkaEventType.TextLinkCreated | KafkaEventType.TextLinkDeleted;
  id: string;
}

export interface KafkaTextSitemapEventMessage {
  eventType: KafkaEventType.TextLinkCreated | KafkaEventType.TextLinkDeleted;
  eventVersion: string;
  textSitemap: {
    id: string;
    url: string;
    isIgnored: boolean;
    isDeleted: boolean;
    createdAt: number;
    updatedAt: number;
  };
}
