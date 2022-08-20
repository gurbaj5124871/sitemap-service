import { Injectable, Logger } from '@nestjs/common';
import {
  VideoSitemap,
  SitemapFileLifeCycle,
  SitemapFileEntityType,
} from '@prisma/client';
import {
  SitemapStream,
  streamToPromise,
  parseSitemap,
  SitemapItem,
  EnumChangefreq,
  EnumYesNo,
} from 'sitemap';
import { Readable } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../config';
import { PrismaService } from '../prisma.service';
import { LocksService, FailedToAcquireLockError } from '../locks/locks.service';
import { AwsS3Service } from '../s3/aws-s3.service';
import { VideoSitemapsService } from './video-sitemaps.service';
import { SitemapsIndexService } from '../sitemaps/sitemaps-index.service';
import { SitemapsService } from '../sitemaps/sitemaps.service';

@Injectable()
export class VideoSitemapsProcessorService {
  private readonly logger: Logger = new Logger(
    VideoSitemapsProcessorService.name,
  );
  private readonly frontendDomain: string;
  private readonly entityType = SitemapFileEntityType.VIDEO;

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly prisma: PrismaService,
    private readonly locksService: LocksService,
    private readonly awsS3Service: AwsS3Service,
    private readonly videoSitemapsService: VideoSitemapsService,
    private readonly sitemapIndexService: SitemapsIndexService,
    private readonly sitemapsService: SitemapsService,
  ) {
    this.frontendDomain = this.configService.get('frontendDomain');
  }

  async newLinksHandler(
    sitemapFile: {
      fileName: string;
      indexName: string;
    },
    videoSitemaps: VideoSitemap[],
  ) {
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(
        sitemapFile.fileName,
      );

      const fileExistenceStatue = await this.sitemapsService.findUnique(
        sitemapFile.fileName,
      );

      if (!fileExistenceStatue) {
        await this.processLinksWithNewSitemapFile(sitemapFile, videoSitemaps);
      } else {
        await this.processLinksWithExistingSitemapFile(
          sitemapFile.fileName,
          videoSitemaps,
        );
      }
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          fileName: sitemapFile.fileName,
        });
      } else {
        this.logger.error({
          message: 'Error while processing new video sitemap links',
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(sitemapFile.fileName);
      }
    }
  }

  private async processLinksWithNewSitemapFile(
    sitemapFile: {
      fileName: string;
      indexName: string;
    },
    videoSitemaps: VideoSitemap[],
  ) {
    // Check for index file existence status
    await this.sitemapIndexService.ensureIndexFileExistence({
      indexFileName: sitemapFile.indexName,
      entityType: this.entityType,
    });

    const links: SitemapItem[] = videoSitemaps.map((video) => {
      const link: SitemapItem = {
        url: video.link,
        lastmod: video.createdAt.toISOString(),
        changefreq: EnumChangefreq.WEEKLY,
        video: [
          {
            thumbnail_loc: video.thumbnail,
            title: video.title,
            description: video.description,
            player_loc: video.videoURL,

            tag: [],
            family_friendly: EnumYesNo.yes,
            live: EnumYesNo.no,
            duration: video.actualDurationInSeconds,
            publication_date: video.createdAt.toISOString(),
            platform: 'web mobile tv',
            requires_subscription: EnumYesNo.no,
            'player_loc:allow_embed': EnumYesNo.yes,
          },
        ],
        links: [],
        img: [],
      };
      return link;
    });

    const stream = new SitemapStream({ hostname: this.frontendDomain });

    const compressedSitemapXML = await streamToPromise(
      Readable.from(links).pipe(stream).pipe(createGzip()),
    );

    const { s3Key, s3Location } =
      this.sitemapsService.getSitemapFileS3KeyAndLocation(
        this.entityType,
        sitemapFile.fileName,
      );
    const contentType = 'application/xml';
    const contentEncoding = 'gzip';
    await this.awsS3Service.uploadToS3(
      {
        name: s3Key,
        body: compressedSitemapXML,
      },
      {
        contentType,
        contentEncoding,
      },
    );

    const newSitemapFile = await this.prisma.$transaction(async (prisma) => {
      const newSitemapFile = await prisma.sitemapFile.create({
        data: {
          fileName: sitemapFile.fileName,
          link: this.sitemapsService.getSitemapFileServingURL({
            fileName: sitemapFile.fileName,
            entityType: this.entityType,
          }),
          location: s3Location,
          lifeCycle: SitemapFileLifeCycle.UPLOADED,
          entityType: this.entityType,
          indexFileName: sitemapFile.indexName,
        },
      });
      await prisma.videoSitemap.updateMany({
        where: {
          id: {
            in: videoSitemaps.map((video) => video.id),
          },
        },
        data: {
          fileName: sitemapFile.fileName,
        },
      });
      return newSitemapFile;
    });

    await this.sitemapsService
      .pingGoogleToCrawlSitemap(newSitemapFile)
      .catch((err) => {
        this.logger.error({
          message: 'Failed to ping google with new sitemap file',
          err,
          newSitemapFile,
        });
      });
  }

  private async processLinksWithExistingSitemapFile(
    fileName: string,
    videoSitemaps: VideoSitemap[],
  ) {
    const { s3Key } = this.sitemapsService.getSitemapFileS3KeyAndLocation(
      this.entityType,
      fileName,
    );
    const sitemapFileResp = await this.awsS3Service.getObject({
      Key: s3Key,
    });

    const sitemapLinks = await parseSitemap(
      (sitemapFileResp.Body as Readable).pipe(createGunzip()),
    );

    videoSitemaps.forEach((video) => {
      const link: SitemapItem = {
        url: video.link,
        lastmod: video.createdAt.toISOString(),
        changefreq: EnumChangefreq.WEEKLY,
        video: [
          {
            thumbnail_loc: video.thumbnail,
            title: video.title,
            description: video.description,
            player_loc: video.videoURL,

            tag: [],
            family_friendly: EnumYesNo.yes,
            live: EnumYesNo.no,
            duration: video.actualDurationInSeconds,
            publication_date: video.createdAt.toISOString(),
            platform: 'web mobile tv',
            requires_subscription: EnumYesNo.no,
            'player_loc:allow_embed': EnumYesNo.yes,
          },
        ],
        links: [],
        img: [],
      };
      sitemapLinks.push(link);
    });

    const stream = new SitemapStream({ hostname: this.frontendDomain });
    const compressedSitemapXML = await streamToPromise(
      Readable.from(sitemapLinks).pipe(stream).pipe(createGzip()),
    );

    const contentType = 'application/xml';
    const contentEncoding = 'gzip';
    await this.awsS3Service.uploadToS3(
      {
        name: s3Key,
        body: compressedSitemapXML,
      },
      {
        contentType,
        contentEncoding,
      },
    );

    await this.prisma.$transaction([
      this.prisma.videoSitemap.updateMany({
        where: {
          id: {
            in: videoSitemaps.map((video) => video.id),
          },
        },
        data: {
          fileName,
        },
      }),
      this.sitemapsService.updateSitemapFileMarkedAsLastMod(fileName),
    ]);

    const sitemapFile = await this.sitemapsService.findUnique(fileName);
    if (!sitemapFile) {
      return;
    }
    await this.sitemapsService
      .pingGoogleToCrawlSitemap(sitemapFile)
      .catch((err) => {
        this.logger.error({
          message: 'Failed to ping google with updated sitemap file',
          err,
          sitemapFile,
        });
      });
  }

  async handleUpdatedOrDeletedLinks(args: {
    operation: 'UPDATED' | 'DELETED';
    fileName: string;
    videoSitemaps: VideoSitemap[];
  }) {
    const { operation, fileName, videoSitemaps } = args;
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(fileName);

      const fileExistenceStatue = await this.sitemapsService.findUnique(
        fileName,
      );

      if (!fileExistenceStatue) {
        this.logger.debug({
          message: `Sitemap file doesn't exists for video sitemaps for operation: ${operation}`,
          fileName,
          videoSitemaps,
        });

        if (operation === 'DELETED') {
          await this.videoSitemapsService.updateVideoSitemapsMarkedForDeletionAsDeleted(
            videoSitemaps.map((s) => s.id),
          );
        } else {
          await this.videoSitemapsService.unsetMarkedForUpdateForVideoSitemaps(
            videoSitemaps.map((s) => s.id),
          );
        }
        return;
      }

      const { s3Key } = this.sitemapsService.getSitemapFileS3KeyAndLocation(
        this.entityType,
        fileName,
      );

      const sitemapFileResp = await this.awsS3Service
        .getObject({
          Key: s3Key,
        })
        .catch((e) => {
          this.logger.debug({
            message: `Sitemap file not found on s3 for video sitemaps marked for operation: ${operation}`,
            fileName,
            videoSitemaps,
          });
          this.logger.log(e);
        });
      if (!sitemapFileResp) {
        if (operation === 'DELETED') {
          await this.videoSitemapsService.updateVideoSitemapsMarkedForDeletionAsDeleted(
            videoSitemaps.map((s) => s.id),
          );
        } else {
          await this.videoSitemapsService.unsetMarkedForUpdateForVideoSitemaps(
            videoSitemaps.map((s) => s.id),
          );
        }
        return;
      }

      const sitemapLinks = await parseSitemap(
        (sitemapFileResp.Body as Readable).pipe(createGunzip()),
      );
      const sitemapLinksToModify = new Set(videoSitemaps.map((s) => s.link));
      const videoSitemapsByLink = videoSitemaps.reduce((map, video) => {
        map.set(video.link, video);
        return map;
      }, new Map());

      sitemapLinks.forEach((link) => {
        if (sitemapLinksToModify.has(link.url)) {
          if (operation === 'UPDATED') {
            const videoForSitemapURL = videoSitemapsByLink.get(link.url);
            if (videoForSitemapURL) {
              link.video = [
                {
                  thumbnail_loc: videoForSitemapURL.thumbnail,
                  title: videoForSitemapURL.title,
                  description: videoForSitemapURL.description,
                  player_loc: videoForSitemapURL.videoURL,

                  tag: [],
                  family_friendly: EnumYesNo.yes,
                  live: EnumYesNo.no,
                  duration: videoForSitemapURL.actualDurationInSeconds,
                  publication_date: videoForSitemapURL.createdAt.toISOString(),
                  platform: 'web mobile tv',
                  requires_subscription: EnumYesNo.no,
                  'player_loc:allow_embed': EnumYesNo.yes,
                },
              ];
            }

            link.lastmod = new Date().toISOString();
            link.changefreq = EnumChangefreq.HOURLY;
          } else {
            link.lastmod = new Date().toISOString();
            link.changefreq = EnumChangefreq.NEVER;
            link.video = [];
          }
        }
      });

      const stream = new SitemapStream({ hostname: this.frontendDomain });
      const compressedSitemapXML = await streamToPromise(
        Readable.from(sitemapLinks).pipe(stream).pipe(createGzip()),
      );

      const contentType = 'application/xml';
      const contentEncoding = 'gzip';
      await this.awsS3Service.uploadToS3(
        {
          name: s3Key,
          body: compressedSitemapXML,
        },
        {
          contentType,
          contentEncoding,
        },
      );

      if (operation === 'DELETED') {
        await this.videoSitemapsService.updateVideoSitemapsMarkedForDeletionAsDeleted(
          videoSitemaps.map((s) => s.id),
        );
      } else {
        await this.videoSitemapsService.unsetMarkedForUpdateForVideoSitemaps(
          videoSitemaps.map((s) => s.id),
        );
      }

      const sitemapFile = await this.sitemapsService.findUnique(fileName);
      if (!sitemapFile) {
        return;
      }
      await this.sitemapsService
        .pingGoogleToCrawlSitemap(sitemapFile)
        .catch((err) => {
          this.logger.error({
            message:
              'Failed to ping google with updated sitemap file with deleted links',
            err,
            sitemapFile,
          });
        });
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          fileName,
        });
      } else {
        this.logger.error({
          message: `Error while processing video sitemaps links for operation: ${operation}`,
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(fileName);
      }
    }
  }
}
