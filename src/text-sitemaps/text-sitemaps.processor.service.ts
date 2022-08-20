import { Injectable, Logger } from '@nestjs/common';
import {
  TextSitemap,
  SitemapFileLifeCycle,
  SitemapFileEntityType,
} from '@prisma/client';
import {
  SitemapStream,
  streamToPromise,
  parseSitemap,
  SitemapItem,
  EnumChangefreq,
} from 'sitemap';
import { Readable } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../config';
import { PrismaService } from '../prisma.service';
import { LocksService, FailedToAcquireLockError } from '../locks/locks.service';
import { AwsS3Service } from '../s3/aws-s3.service';
import { SitemapsService } from '../sitemaps/sitemaps.service';
import { SitemapsIndexService } from '../sitemaps/sitemaps-index.service';
import { TextSitemapsService } from './text-sitemaps.service';

/**
 * For sitemap xml standards visit: // https://www.sitemaps.org/protocol.html#xmlTagDefinitions
 */
@Injectable()
export class TextSitemapsProcessorService {
  private readonly logger: Logger = new Logger(
    TextSitemapsProcessorService.name,
  );
  private readonly frontendDomain: string;
  private readonly entityType = SitemapFileEntityType.TEXT;

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly prisma: PrismaService,
    private readonly locksService: LocksService,
    private readonly awsS3Service: AwsS3Service,
    private readonly sitemapsService: SitemapsService,
    private readonly sitemapIndexService: SitemapsIndexService,
    private readonly textSitemapsService: TextSitemapsService,
  ) {
    this.frontendDomain = this.configService.get('frontendDomain');
  }

  async newLinksHandler(
    sitemapFile: {
      fileName: string;
      indexName: string;
    },
    textSitemaps: TextSitemap[],
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
        await this.processLinksWithNewSitemapFile(sitemapFile, textSitemaps);
      } else {
        await this.processLinksWithExistingSitemapFile(
          sitemapFile.fileName,
          textSitemaps,
        );
      }
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          fileName: sitemapFile.fileName,
          indexName: sitemapFile.indexName,
        });
      } else {
        this.logger.error({
          message: 'Error while processing new text sitemaps links',
        });
        this.logger.error(err);

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
    textSitemaps: TextSitemap[],
  ) {
    // Check for index file existence status
    await this.sitemapIndexService.ensureIndexFileExistence({
      indexFileName: sitemapFile.indexName,
      entityType: this.entityType,
    });

    const links: SitemapItem[] = textSitemaps.map((textSitemap) => {
      const link: SitemapItem = {
        url: textSitemap.link,
        lastmod: textSitemap.createdAt.toISOString(),
        /**
         * Change the frequency accordingly.
         */
        changefreq: EnumChangefreq.HOURLY,
        img: [],
        video: [],
        links: [],
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
      await prisma.textSitemap.updateMany({
        where: {
          id: {
            in: textSitemaps.map((textSitemap) => textSitemap.id),
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
    textSitemaps: TextSitemap[],
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

    textSitemaps.forEach((textSitemap) => {
      const link: SitemapItem = {
        url: textSitemap.link,
        lastmod: textSitemap.createdAt.toISOString(),
        /**
         * Change the frequency accordingly.
         */
        changefreq: EnumChangefreq.HOURLY,
        img: [],
        video: [],
        links: [],
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
      this.prisma.textSitemap.updateMany({
        where: {
          id: {
            in: textSitemaps.map((textSitemap) => textSitemap.id),
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

  async deleteLinksHandler(fileName: string, textSitemaps: TextSitemap[]) {
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(fileName);

      const fileExistenceStatue = await this.sitemapsService.findUnique(
        fileName,
      );

      if (!fileExistenceStatue) {
        this.logger.debug({
          message:
            "Sitemap file doesn't exists for text sitemaps marked for deletion, hence marking them as deleted and skipping ",
          fileName,
          textSitemaps,
        });

        await this.textSitemapsService.updateTextSitemapsMarkedForDeletionAsDeleted(
          textSitemaps.map((textSitemap) => textSitemap.id),
        );
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
            message:
              'Sitemap file not found on s3 for text sitemap marked for deletion, hence marking them as deleted and skipping ',
            fileName,
            textSitemaps,
            err: e,
          });
        });
      if (!sitemapFileResp) {
        await this.textSitemapsService.updateTextSitemapsMarkedForDeletionAsDeleted(
          textSitemaps.map((textSitemap) => textSitemap.id),
        );
        return;
      }

      const sitemapLinks = await parseSitemap(
        (sitemapFileResp.Body as Readable).pipe(createGunzip()),
      );
      const sitemapLinksToDelete = new Set(
        textSitemaps.map((textSitemap) => textSitemap.link),
      );

      sitemapLinks.forEach((link) => {
        if (sitemapLinksToDelete.has(link.url)) {
          link.lastmod = new Date().toISOString();
          link.changefreq = EnumChangefreq.NEVER;
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

      await this.prisma.$transaction([
        this.textSitemapsService.updateTextSitemapsMarkedForDeletionAsDeleted(
          textSitemaps.map((textSitemap) => textSitemap.id),
        ),
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
          message: 'Error while processing deleted text sitemaps links',
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
