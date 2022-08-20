import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KafkaClientProvider } from '../kafka-client.provider';
import { PrismaService } from '../prisma.service';
import { LocksModule } from 'src/locks/locks.module';
import { AwsS3Module } from 'src/s3/s3.module';
import { TextSitemapsService } from './text-sitemaps.service';
import { TextSitemapsConsumerService } from './text-sitemaps-consumer.service';

@Module({
  imports: [HttpModule, LocksModule, AwsS3Module],
  providers: [
    Logger,
    KafkaClientProvider,
    PrismaService,
    TextSitemapsService,
    TextSitemapsConsumerService,
  ],
  exports: [TextSitemapsService, TextSitemapsConsumerService],
})
export class TextSitemapsModule {}
