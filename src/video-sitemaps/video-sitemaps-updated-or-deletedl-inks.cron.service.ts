import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VideoSitemap, SitemapFileEntityType } from '@prisma/client';
import { VideoSitemapsService } from './video-sitemaps.service';
import { VideoSitemapsProcessorService } from './video-sitemaps.processor.service';
import { SitemapsService } from '../sitemaps/sitemaps.service';

@Injectable()
export class VideoSitemapsUpdatedOrDeletedLinksCronService {
  private readonly logger: Logger = new Logger(
    VideoSitemapsUpdatedOrDeletedLinksCronService.name,
  );
  private readonly entityType = SitemapFileEntityType.VIDEO;

  constructor(
    private readonly videoSitemapsService: VideoSitemapsService,
    private readonly videoSitemapsProcessorService: VideoSitemapsProcessorService,
    private readonly sitemapsService: SitemapsService,
  ) {}

  @Cron('0 25 * * * *') // every hour, at the start of the 25th minute
  async processMarkedForDeletionVideoSitemaps() {
    try {
      this.logger.log({
        message:
          'Cron triggered for processing video sitemaps marked for deletion',
      });

      const markedForDeletionLinks =
        await this.videoSitemapsService.getMarkedForDeletionVideoSitemapLinks();
      if (!markedForDeletionLinks.length) {
        return;
      }

      this.logger.debug({
        message: 'Found video sitemaps links marked for deletion',
        markedForDeletionLinks,
        count: markedForDeletionLinks.length,
      });

      const videosByFile: Map<string, VideoSitemap[]> = new Map();
      markedForDeletionLinks.forEach((video) => {
        const { fileName } = this.sitemapsService.getSitemapFileName(
          this.entityType,
          {
            counter: video.counter,
            modulusHashBase: video.modulusHashBase,
            modulusHashValue: video.modulusHashValue,
          },
        );
        videosByFile.set(fileName, [
          ...(videosByFile.get(fileName) || []),
          video,
        ]);
      });

      await Promise.all(
        [...videosByFile.keys()].map(async (siteMapFile) => {
          try {
            const videoSitemaps = videosByFile.get(siteMapFile);
            await this.videoSitemapsProcessorService.handleUpdatedOrDeletedLinks(
              {
                operation: 'DELETED',
                fileName: siteMapFile,
                videoSitemaps,
              },
            );
          } catch (e) {
            this.logger.error({
              message:
                'Error while processing video sitemaps links marked for deletion',
              err: e,
            });
          }
        }),
      );
    } catch (err) {
      this.logger.error(err);
    }
  }

  @Cron('0 35 * * * *') // every hour, at the start of the 35th minute
  async processMarkedForUpdateVideoSitemaps() {
    try {
      this.logger.log({
        message:
          'Cron triggered for processing video sitemaps marked for update',
      });

      const markedForUpdateLinks =
        await this.videoSitemapsService.getMarkedForUpdateVideoSitemapLinks();
      if (!markedForUpdateLinks.length) {
        return;
      }
      this.logger.debug({
        message: 'Found video sitemap links marked for update',
        markedForUpdateLinks,
        count: markedForUpdateLinks.length,
      });

      const videosByFile: Map<string, VideoSitemap[]> = new Map();
      markedForUpdateLinks.forEach((video) => {
        const { fileName } = this.sitemapsService.getSitemapFileName(
          this.entityType,
          {
            counter: video.counter,
            modulusHashBase: video.modulusHashBase,
            modulusHashValue: video.modulusHashValue,
          },
        );
        videosByFile.set(fileName, [
          ...(videosByFile.get(fileName) || []),
          video,
        ]);
      });

      await Promise.all(
        [...videosByFile.keys()].map(async (siteMapFile) => {
          try {
            const videoSitemaps = videosByFile.get(siteMapFile);
            await this.videoSitemapsProcessorService.handleUpdatedOrDeletedLinks(
              {
                operation: 'UPDATED',
                fileName: siteMapFile,
                videoSitemaps,
              },
            );
          } catch (e) {
            this.logger.error({
              message: 'Error while processing video sitemap marked for update',
              err: e,
            });
          }
        }),
      );
    } catch (err) {
      this.logger.error(err);
    }
  }
}
