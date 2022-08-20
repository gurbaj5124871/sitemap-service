import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KafkaClientProvider } from '../kafka-client.provider';
import { PrismaService } from '../prisma.service';
import { LocksModule } from 'src/locks/locks.module';
import { AwsS3Module } from 'src/s3/s3.module';
import { SitemapsModule } from 'src/sitemaps/sitemaps.module';
import { TextSitemapsService } from './text-sitemaps.service';
import { TextSitemapsConsumerService } from './text-sitemaps-consumer.service';
import { TextSitemapsNewLinksCronService } from './text-sitemaps-new-links.cron.service';
import { TextSitemapsDeletedLinksCronService } from './text-sitemaps-delete-links.cron.service';
import { TextSitemapsProcessorService } from './text-sitemaps.processor.service';

@Module({
  imports: [HttpModule, LocksModule, AwsS3Module, SitemapsModule],
  providers: [
    Logger,
    KafkaClientProvider,
    PrismaService,
    TextSitemapsService,
    TextSitemapsConsumerService,
    TextSitemapsNewLinksCronService,
    TextSitemapsDeletedLinksCronService,
    TextSitemapsProcessorService,
  ],
  exports: [
    TextSitemapsService,
    TextSitemapsConsumerService,
    TextSitemapsNewLinksCronService,
    TextSitemapsDeletedLinksCronService,
    TextSitemapsProcessorService,
  ],
})
export class TextSitemapsModule {}
