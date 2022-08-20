import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KafkaClientProvider } from '../kafka-client.provider';
import { PrismaService } from '../prisma.service';
import { LocksModule } from 'src/locks/locks.module';
import { AwsS3Module } from 'src/s3/s3.module';
import { SitemapsModule } from 'src/sitemaps/sitemaps.module';
import { VideoSitemapsService } from './video-sitemaps.service';
import { VideoSitemapsConsumerService } from './video-sitemaps-consumer.service';
import { VideoSitemapsNewLinksCronService } from './video-sitemaps-new-links.cron.service';
import { VideoSitemapsProcessorService } from './video-sitemaps.processor.service';
import { VideoSitemapsUpdatedOrDeletedLinksCronService } from './video-sitemaps-updated-or-deletedl-inks.cron.service';

@Module({
  imports: [HttpModule, LocksModule, AwsS3Module, SitemapsModule],
  providers: [
    Logger,
    KafkaClientProvider,
    PrismaService,
    VideoSitemapsService,
    VideoSitemapsConsumerService,
    VideoSitemapsNewLinksCronService,
    VideoSitemapsProcessorService,
    VideoSitemapsUpdatedOrDeletedLinksCronService,
  ],
  exports: [
    VideoSitemapsService,
    VideoSitemapsConsumerService,
    VideoSitemapsNewLinksCronService,
    VideoSitemapsProcessorService,
    VideoSitemapsUpdatedOrDeletedLinksCronService,
  ],
})
export class VideoSitemapsModule {}
