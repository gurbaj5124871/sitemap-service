import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TextSitemap, SitemapFileEntityType } from '@prisma/client';
import { SitemapsService } from '../sitemaps/sitemaps.service';
import { SitemapsIndexService } from '../sitemaps/sitemaps-index.service';
import { TextSitemapsService } from './text-sitemaps.service';
import { TextSitemapsProcessorService } from './text-sitemaps.processor.service';

@Injectable()
export class TextSitemapsNewLinksCronService {
  private readonly logger: Logger = new Logger(
    TextSitemapsNewLinksCronService.name,
  );

  constructor(
    private readonly sitemapsService: SitemapsService,
    private readonly sitemapIndexService: SitemapsIndexService,
    private readonly textSitemapsService: TextSitemapsService,
    private readonly textSitemapsProcessorService: TextSitemapsProcessorService,
  ) {}

  async newTextSitemapsLinksProcessHandler(modulusHashValue: number) {
    try {
      const unprocessedTextSitemapLinks =
        await this.textSitemapsService.getUnprocessedTextSitemapLinks({
          modulus: {
            modulusHashBase: 10,
            modulusHashValue: [modulusHashValue],
          },
        });
      if (!unprocessedTextSitemapLinks.length) {
        this.logger.log({
          message: `No unprocessed text sitemap links for modulus hash value ${modulusHashValue}`,
        });
        return;
      }

      this.logger.debug({
        message: 'Processing new text sitemap links',
        unprocessedTextSitemapLinks,
        count: unprocessedTextSitemapLinks.length,
      });

      const textSitemapsByFile: Map<string, TextSitemap[]> = new Map();
      const sitemapFileNameIncrementHM: Map<string, number> = new Map();

      unprocessedTextSitemapLinks.forEach((textSitemap) => {
        const { fileName, fileIncrement } =
          this.sitemapsService.getSitemapFileName(SitemapFileEntityType.TEXT, {
            counter: textSitemap.counter,
            modulusHashBase: textSitemap.modulusHashBase,
            modulusHashValue: textSitemap.modulusHashValue,
          });

        textSitemapsByFile.set(fileName, [
          ...(textSitemapsByFile.get(fileName) || []),
          textSitemap,
        ]);
        sitemapFileNameIncrementHM.set(fileName, fileIncrement);
      });

      await Promise.all(
        [...textSitemapsByFile.keys()].map(async (siteMapFile) => {
          try {
            const textSitemaps = textSitemapsByFile.get(siteMapFile);
            await this.textSitemapsProcessorService.newLinksHandler(
              {
                fileName: siteMapFile,
                indexName: this.sitemapIndexService.getIndexFileName(
                  SitemapFileEntityType.TEXT,
                  sitemapFileNameIncrementHM.get(siteMapFile),
                ),
              },
              textSitemaps,
            );
          } catch (e) {
            this.logger.error({
              message: 'Error while processing new text Sitemap links',
              modulusHashValue,
            });
            this.logger.error(e);
          }
        }),
      );
    } catch (err) {
      this.logger.error({
        message: 'Error while processing new text sitemap links',
      });
      this.logger.error(err);
    }
  }

  @Cron('0 0 * * * *') // every hour at the start
  async processNewTextSitemapLinksForModulusHashValueZero() {
    await this.newTextSitemapsLinksProcessHandler(0);
  }

  @Cron('0 5 * * * *') // every hour at the start of 5th minute
  async processNewTextSitemapLinksForModulusHashValueOne() {
    await this.newTextSitemapsLinksProcessHandler(1);
  }

  @Cron('0 10 * * * *') // every hour at the start of 10th minute
  async processNewTextSitemapLinksForModulusHashValueTwo() {
    await this.newTextSitemapsLinksProcessHandler(2);
  }
  @Cron('0 15 * * * *') // every hour at the start of 15th minute
  async processNewTextSitemapLinksForModulusHashValueOThree() {
    await this.newTextSitemapsLinksProcessHandler(3);
  }
  @Cron('0 20 * * * *') // every hour at the start of 20th minute
  async processNewTextSitemapLinksForModulusHashValueFour() {
    await this.newTextSitemapsLinksProcessHandler(4);
  }
  @Cron('0 25 * * * *') // every hour at the start of 25th minute
  async processNewTextSitemapLinksForModulusHashValueFive() {
    await this.newTextSitemapsLinksProcessHandler(5);
  }
  @Cron('0 30 * * * *') // every hour at the start of 30th minute
  async processNewTextSitemapLinksForModulusHashValueSix() {
    await this.newTextSitemapsLinksProcessHandler(6);
  }
  @Cron('0 35 * * * *') // every hour at the start of 35th minute
  async processNewTextSitemapLinksForModulusHashValueSeven() {
    await this.newTextSitemapsLinksProcessHandler(7);
  }
  @Cron('0 40 * * * *') // every hour at the start of 40th minute
  async processNewTextSitemapLinksForModulusHashValueEight() {
    await this.newTextSitemapsLinksProcessHandler(8);
  }
  @Cron('0 45 * * * *') // every hour at the start of 45th minute
  async processNewTextSitemapLinksForModulusHashValueNine() {
    await this.newTextSitemapsLinksProcessHandler(9);
  }
}
