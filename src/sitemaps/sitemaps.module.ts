import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../prisma.service';
import { LocksService } from '../locks/locks.service';
import { AwsS3Service } from '../s3/aws-s3.service';
import { SitemapsService } from './sitemaps.service';
import { SitemapsIndexService } from './sitemaps-index.service';
import { SitemapsIndexLinkingCronService } from './sitemaps-index-linking.cron.service';
import { SitemapsController } from './sitemaps.controller';

@Module({
  imports: [HttpModule],
  providers: [
    Logger,
    PrismaService,
    LocksService,
    AwsS3Service,
    SitemapsService,
    SitemapsIndexService,
    SitemapsIndexLinkingCronService,
  ],
  exports: [
    SitemapsService,
    SitemapsIndexService,
    SitemapsIndexLinkingCronService,
  ],
  controllers: [SitemapsController],
})
export class SitemapsModule {}
