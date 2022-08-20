import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SitemapFile, SitemapFileEntityType } from '@prisma/client';
import { LocksService, FailedToAcquireLockError } from '../locks/locks.service';
import { SitemapsIndexService } from './sitemaps-index.service';
import { SitemapsService } from './sitemaps.service';

@Injectable()
export class SitemapsIndexLinkingCronService {
  private readonly logger: Logger = new Logger(
    SitemapsIndexLinkingCronService.name,
  );
  private readonly textSitemapsIndexLockName = `text-sitemaps-index`;
  private readonly videoSitemapsLockName = `video-sitemaps-index`;
  private readonly sitemapsIndexLockName = `sitemaps-index`;

  constructor(
    private readonly locksService: LocksService,
    private readonly sitemapIndexService: SitemapsIndexService,
    private readonly sitemapsService: SitemapsService,
  ) {}

  @Cron('0 10 * * * *') // every 10 minutes of the hour
  async processNewTextSitemapsAvailableForIndexLinking() {
    this.logger.log({
      message:
        'Cron triggered for processing new text sitemaps available for index linking',
    });
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(
        this.textSitemapsIndexLockName,
      );

      await this.linkNewSitemapsToIndex(SitemapFileEntityType.TEXT);
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          lock: this.textSitemapsIndexLockName,
        });
      } else {
        this.logger.error({
          message:
            'Error while processing new text sitemap files index linking',
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(this.textSitemapsIndexLockName);
      }
    }
  }

  @Cron('0 20 * * * *') // every 20th minute of the hour
  async processExistingTextSitemapsAvailableForLastModUpdate() {
    this.logger.log({
      message:
        'Cron triggered for processing existing text sitemaps available for last modified index file update',
    });
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(
        this.textSitemapsIndexLockName,
      );

      const textSitemapFiles =
        await this.sitemapsService.fetchSitemapFilesForLastModUpdate(
          SitemapFileEntityType.TEXT,
        );
      if (!textSitemapFiles.length) {
        return;
      }

      this.logger.debug({
        message: `Processing existing text sitemaps for last mod update`,
        count: textSitemapFiles.length,
        textSitemapFiles,
      });

      await this.processExistingSitemapsAvailableForLastModUpdate(
        SitemapFileEntityType.TEXT,
        textSitemapFiles,
      );
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          lock: this.textSitemapsIndexLockName,
        });
      } else {
        this.logger.error({
          message:
            'Error while processing new text sitemap files index linking',
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(this.textSitemapsIndexLockName);
      }
    }
  }

  @Cron('0 15 * * * *') // every 15th minute of the hour
  async processNewVideoSitemapsAvailableForIndexLinking() {
    this.logger.log({
      message:
        'Cron triggered for processing new video sitemaps available for index linking',
    });
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(
        this.videoSitemapsLockName,
      );

      await this.linkNewSitemapsToIndex(SitemapFileEntityType.VIDEO);
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          lock: this.videoSitemapsLockName,
        });
      } else {
        this.logger.error({
          message:
            'Error while processing new video sitemap files index linking',
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(this.videoSitemapsLockName);
      }
    }
  }

  @Cron('0 30 * * * *') // every 30th minute of the hour
  async processExistingVideoSitemapsAvailableForLastModUpdate() {
    this.logger.log({
      message:
        'Cron triggered for processing existing video sitemaps available for last modified index file update',
    });
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(
        this.videoSitemapsLockName,
      );

      const videoSitemapFiles =
        await this.sitemapsService.fetchSitemapFilesForLastModUpdate(
          SitemapFileEntityType.VIDEO,
        );
      if (!videoSitemapFiles.length) {
        return;
      }

      this.logger.debug({
        message: `Processing existing video sitemaps for last mod update`,
        count: videoSitemapFiles.length,
        videoSitemapFiles,
      });

      await this.processExistingSitemapsAvailableForLastModUpdate(
        SitemapFileEntityType.VIDEO,
        videoSitemapFiles,
      );
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          lock: this.videoSitemapsLockName,
        });
      } else {
        this.logger.error({
          message:
            'Error while processing new video sitemap files index linking',
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(this.videoSitemapsLockName);
      }
    }
  }

  @Cron('0 45 * * * *') // every 45th minute of the hour
  async processNewSitemapIndexFilesAvailableForRobotsDotTxtLinking() {
    this.logger.log({
      message:
        'Cron triggered for processing new sitemap index files available for robots.txt linking',
    });
    let lockKeyAcquired: string | undefined = undefined;
    try {
      lockKeyAcquired = await this.locksService.acquireLock(
        this.sitemapsIndexLockName,
      );

      await this.linkNewSitemapIndexFilesAvailableForRobotsDotTxt();
    } catch (err) {
      if (err instanceof FailedToAcquireLockError) {
        this.logger.log({
          message: 'Cron handler failed to acquire lock, skipping execution',
          lock: this.sitemapsIndexLockName,
        });
      } else {
        this.logger.error({
          message:
            'Error while processing new sitemap indexes for robots.txt linking',
          err,
        });
        throw err;
      }
    } finally {
      if (lockKeyAcquired) {
        await this.locksService.releaseLock(this.sitemapsIndexLockName);
      }
    }
  }

  private async linkNewSitemapsToIndex(entityType: SitemapFileEntityType) {
    const sitemapsForIndexLinking =
      await this.sitemapsService.fetchSitemapFilesForIndexLinking(entityType);
    if (!sitemapsForIndexLinking.length) {
      return;
    }

    this.logger.debug({
      message: `Processing new ${entityType} sitemaps for index linking`,
      sitemapsForIndexLinking,
      count: sitemapsForIndexLinking.length,
    });

    const sitemapsByIndexFile = new Map<string, SitemapFile[]>();
    sitemapsForIndexLinking.forEach((sitemap) => {
      sitemapsByIndexFile.set(sitemap.indexFileName, [
        ...(sitemapsByIndexFile.get(sitemap.indexFileName) || []),
        sitemap,
      ]);
    });

    await Promise.all(
      [...sitemapsByIndexFile.keys()].map(async (indexFileName) => {
        const sitemaps = sitemapsByIndexFile.get(indexFileName);
        try {
          await this.sitemapIndexService.linkNewSitemapsToIndex({
            indexFileName,
            entityType,
            sitemaps,
          });
        } catch (err) {
          this.logger.error({
            message: 'Error while linking new sitemaps to index file',
            err,
            sitemaps,
            indexFileName,
          });
        }
      }),
    );
  }

  private async processExistingSitemapsAvailableForLastModUpdate(
    entityType: SitemapFileEntityType,
    SitemapFiles: SitemapFile[],
  ) {
    const sitemapFilesByIndexFile = new Map<string, SitemapFile[]>();
    SitemapFiles.forEach((sitemapFile) => {
      sitemapFilesByIndexFile.set(sitemapFile.indexFileName, [
        ...(sitemapFilesByIndexFile.get(sitemapFile.indexFileName) || []),
        sitemapFile,
      ]);
    });

    await Promise.all(
      [...sitemapFilesByIndexFile.keys()].map(async (indexFileName) => {
        const sitemapFiles = sitemapFilesByIndexFile.get(indexFileName);
        try {
          await this.sitemapIndexService.updateLastModForSitemapsInIndex({
            indexFileName,
            entityType,
            sitemaps: sitemapFiles,
          });
        } catch (e) {
          this.logger.error({
            message: 'Processing existing sitemaps for last mod update',
            err: e,
            indexFileName,
            sitemapFiles,
          });
        }
      }),
    );
  }

  private async linkNewSitemapIndexFilesAvailableForRobotsDotTxt() {
    const indexFilesForLinking =
      await this.sitemapIndexService.fetchIndexFilesForRobotsDotTxtLinking();
    if (!indexFilesForLinking.length) {
      return;
    }

    this.logger.debug({
      message: `Processing new index sitemaps for robots.txt linking`,
      indexFilesForLinking,
      count: indexFilesForLinking.length,
    });

    await this.sitemapIndexService.linkNexIndexFilesToRobotsDotTxt(
      indexFilesForLinking,
    );
  }
}
