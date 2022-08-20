import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TextSitemap, SitemapFileEntityType } from '@prisma/client';
import { SitemapsService } from '../sitemaps/sitemaps.service';
import { TextSitemapsService } from './text-sitemaps.service';
import { TextSitemapsProcessorService } from './text-sitemaps.processor.service';

@Injectable()
export class TextSitemapsDeletedLinksCronService {
  private readonly logger: Logger = new Logger(
    TextSitemapsDeletedLinksCronService.name,
  );

  constructor(
    private readonly sitemapsService: SitemapsService,
    private readonly textSitemapsService: TextSitemapsService,
    private readonly textSitemapsProcessorService: TextSitemapsProcessorService,
  ) {}

  @Cron('0 50 * * * *') // every hour, at the start of the 50th minute
  async processDeletedSessions() {
    try {
      this.logger.log({
        message: 'Cron triggered for processing text links marked for deletion',
      });
      const markedForDeletionSessionLinks =
        await this.textSitemapsService.getMarkedForDeletionSessionLinks();

      if (!markedForDeletionSessionLinks.length) {
        return;
      }

      this.logger.debug({
        message: 'Found text links marked for deletion',
        markedForDeletionSessionLinks,
        count: markedForDeletionSessionLinks.length,
      });

      const textSitemapsByFile: Map<string, TextSitemap[]> = new Map();
      markedForDeletionSessionLinks.forEach((textSitemap) => {
        const { fileName } = this.sitemapsService.getSitemapFileName(
          SitemapFileEntityType.TEXT,
          {
            counter: textSitemap.counter,
            modulusHashBase: textSitemap.modulusHashBase,
            modulusHashValue: textSitemap.modulusHashValue,
          },
        );
        textSitemapsByFile.set(fileName, [
          ...(textSitemapsByFile.get(fileName) || []),
          textSitemap,
        ]);
      });

      await Promise.all(
        [...textSitemapsByFile.keys()].map(async (siteMapFile) => {
          try {
            const textSitemaps = textSitemapsByFile.get(siteMapFile);
            await this.textSitemapsProcessorService.deleteLinksHandler(
              siteMapFile,
              textSitemaps,
            );
          } catch (e) {
            this.logger.error({
              message:
                'Error while processing text sitemap links marked for deletion',
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
