export enum KafkaEventType {
  TextLinkCreated = 'TEXT_LINK_CREATED',
  TextLinkDeleted = 'TEXT_LINK_DELETED',
}

export interface KafkaBaseEvent {
  eventType: KafkaEventType;
  eventVersion: string;
}

export enum SitemapsIndexFilesS3KeyByEntity {
  Session = 'sessions/sessions-index',
  SessionRecordingClip = 'session_recording_clips/session_recording_clips-index',
}
