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
import { TextSitemapsService } from './text-sitemaps.service';
import { KafkaEventType } from '../types';
import { KafkaTextSitemapEventMessage } from './dto/text-sitemaps-kafka.dto';

@Injectable()
export class TextSitemapsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: Logger = new Logger(
    TextSitemapsConsumerService.name,
  );
  private consumer: Consumer;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: Kafka,
    private readonly configService: ConfigService<ConfigType>,
    private readonly textSitemapsService: TextSitemapsService,
  ) {}

  async onModuleInit() {
    const topicName = this.configService.get('kafkaTextSitemapsTopicName', {
      infer: true,
    });
    const deployEnv = this.configService.get('deployEnv', { infer: true });

    this.consumer = this.kafkaClient.consumer({
      groupId: `sitemaps-service-text-sitemaps-consumer-${deployEnv}`,
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
    ) as KafkaTextSitemapEventMessage;
    const eventType = body.eventType;

    switch (eventType) {
      case KafkaEventType.TextLinkCreated:
        await this.textSitemapsService.create(body.textSitemap);
        break;
      case KafkaEventType.TextLinkDeleted:
        await this.textSitemapsService.delete(body.textSitemap);
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
