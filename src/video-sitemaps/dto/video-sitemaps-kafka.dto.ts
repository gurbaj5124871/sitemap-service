import { KafkaBaseEvent, KafkaEventType } from '../../types';

export interface KafkaVideoSitemapEventHeaders extends KafkaBaseEvent {
  eventType:
    | KafkaEventType.VideoLinkCreated
    | KafkaEventType.VideoLinkUpdated
    | KafkaEventType.VideoLinkDeleted;
  id: string;
}

export interface KafkaVideoSitemapEventMessage {
  eventType:
    | KafkaEventType.VideoLinkCreated
    | KafkaEventType.VideoLinkUpdated
    | KafkaEventType.VideoLinkDeleted;
  eventVersion: string;
  videoSitemap: {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    startTimestamp: Date;
    endTimestamp: Date | null;
    actualDurationInSeconds: number;
    link: string;
    videoURL: string;

    isIgnored: boolean;
    isDeleted: boolean;
    createdAt: number;
    updatedAt: number;
  };
}
