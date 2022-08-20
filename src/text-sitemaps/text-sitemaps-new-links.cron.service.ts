import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TextSitemapsService } from './text-sitemaps.service';

@Injectable()
export class TextSitemapsNewLinksCronService {
  private readonly logger: Logger = new Logger(
    TextSitemapsNewLinksCronService.name,
  );

  constructor(private readonly textSitemapsService: TextSitemapsService) {}

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
    } catch (err) {
      this.logger.error({
        message: 'Error while processing new text sitemap links',
      });
      this.logger.error(err);
    }
  }

  @Cron('0 0 * * * *') // every hour at the start
  async processNewSessionLinksForModulusHashValueZero() {
    await this.newTextSitemapsLinksProcessHandler(0);
  }

  @Cron('0 5 * * * *') // every hour at the start of 5th minute
  async processNewSessionLinksForModulusHashValueOne() {
    await this.newTextSitemapsLinksProcessHandler(1);
  }

  @Cron('0 10 * * * *') // every hour at the start of 10th minute
  async processNewSessionLinksForModulusHashValueTwo() {
    await this.newTextSitemapsLinksProcessHandler(2);
  }
  @Cron('0 15 * * * *') // every hour at the start of 15th minute
  async processNewSessionLinksForModulusHashValueOThree() {
    await this.newTextSitemapsLinksProcessHandler(3);
  }
  @Cron('0 20 * * * *') // every hour at the start of 20th minute
  async processNewSessionLinksForModulusHashValueFour() {
    await this.newTextSitemapsLinksProcessHandler(4);
  }
  @Cron('0 25 * * * *') // every hour at the start of 25th minute
  async processNewSessionLinksForModulusHashValueFive() {
    await this.newTextSitemapsLinksProcessHandler(5);
  }
  @Cron('0 30 * * * *') // every hour at the start of 30th minute
  async processNewSessionLinksForModulusHashValueSix() {
    await this.newTextSitemapsLinksProcessHandler(6);
  }
  @Cron('0 35 * * * *') // every hour at the start of 35th minute
  async processNewSessionLinksForModulusHashValueSeven() {
    await this.newTextSitemapsLinksProcessHandler(7);
  }
  @Cron('0 40 * * * *') // every hour at the start of 40th minute
  async processNewSessionLinksForModulusHashValueEight() {
    await this.newTextSitemapsLinksProcessHandler(8);
  }
  @Cron('0 45 * * * *') // every hour at the start of 45th minute
  async processNewSessionLinksForModulusHashValueNine() {
    await this.newTextSitemapsLinksProcessHandler(9);
  }
}
