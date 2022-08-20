import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Consumer, Kafka, KafkaMessage } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../config';
import { VideoSitemapsService } from './video-sitemaps.service';
import { KafkaEventType } from '../types';
import { KafkaVideoSitemapEventMessage } from './dto/video-sitemaps-kafka.dto';

@Injectable()
export class VideoSitemapsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: Logger = new Logger(
    VideoSitemapsConsumerService.name,
  );
  private consumer: Consumer;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: Kafka,
    private readonly configService: ConfigService<ConfigType>,
    private readonly videoSitemapsService: VideoSitemapsService,
  ) {}

  async onModuleInit() {
    const topicName = this.configService.get('kafkaVideoSitemapsTopicName', {
      infer: true,
    });
    const deployEnv = this.configService.get('deployEnv', { infer: true });

    this.consumer = this.kafkaClient.consumer({
      groupId: `sitemaps-service-video-sitemaps-consumer-${deployEnv}`,
    });

    await this.consumer.connect();
    await this.consumer.subscribe({ topic: topicName, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message, partition, topic }) => {
        this.logger.log({
          message: 'Consuming Kafka event',
          offset: message.offset,
          partition,
          topic,
        });
        await this.consumerHandler({
          message,
          partition,
          topic,
        });
      },
    });
  }

  async consumerHandler({
    message,
    partition,
    topic,
  }: {
    message: KafkaMessage;
    partition: number;
    topic: string;
  }) {
    const body = JSON.parse(
      message.value.toString(),
    ) as KafkaVideoSitemapEventMessage;
    const eventType = body.eventType;

    switch (eventType) {
      case KafkaEventType.VideoLinkCreated:
        await this.videoSitemapsService.create(body.videoSitemap);
        break;
      case KafkaEventType.VideoLinkUpdated:
        await this.videoSitemapsService.update(body.videoSitemap);
        break;
      case KafkaEventType.VideoLinkDeleted:
        await this.videoSitemapsService.delete(body.videoSitemap);
        break;
      default:
        this.logger.debug({
          message: 'Unsupported event type',
          eventBody: body,
          topic,
          partition,
        });
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
