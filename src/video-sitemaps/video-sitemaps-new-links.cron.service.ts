import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VideoSitemap, SitemapFileEntityType } from '@prisma/client';
import { SitemapsService } from '../sitemaps/sitemaps.service';
import { SitemapsIndexService } from '../sitemaps/sitemaps-index.service';
import { VideoSitemapsService } from './video-sitemaps.service';
import { VideoSitemapsProcessorService } from './video-sitemaps.processor.service';

@Injectable()
export class VideoSitemapsNewLinksCronService {
  private readonly logger: Logger = new Logger(
    VideoSitemapsNewLinksCronService.name,
  );

  constructor(
    private readonly sitemapsService: SitemapsService,
    private readonly sitemapIndexService: SitemapsIndexService,
    private readonly videoSitemapsService: VideoSitemapsService,
    private readonly videoSitemapsProcessorService: VideoSitemapsProcessorService,
  ) {}

  async newVideoSitemapsLinksProcessHandler(modulusHashValue: number) {
    try {
      const unprocessedVideoSitemapLinks =
        await this.videoSitemapsService.getUnprocessedVideoSitemapsLinks({
          modulus: {
            modulusHashBase: 10,
            modulusHashValue: [modulusHashValue],
          },
        });
      if (!unprocessedVideoSitemapLinks.length) {
        this.logger.log({
          message: `No unprocessed video sitemap links for modulus hash value ${modulusHashValue}`,
        });
        return;
      }

      this.logger.debug({
        message: 'Processing new video sitemap links',
        unprocessedVideoSitemapLinks,
        count: unprocessedVideoSitemapLinks.length,
      });

      const videoSitemapsByFile: Map<string, VideoSitemap[]> = new Map();
      const sitemapFileNameIncrementHM: Map<string, number> = new Map();

      unprocessedVideoSitemapLinks.forEach((videoSitemap) => {
        const { fileName, fileIncrement } =
          this.sitemapsService.getSitemapFileName(SitemapFileEntityType.VIDEO, {
            counter: videoSitemap.counter,
            modulusHashBase: videoSitemap.modulusHashBase,
            modulusHashValue: videoSitemap.modulusHashValue,
          });

        videoSitemapsByFile.set(fileName, [
          ...(videoSitemapsByFile.get(fileName) || []),
          videoSitemap,
        ]);
        sitemapFileNameIncrementHM.set(fileName, fileIncrement);
      });

      await Promise.all(
        [...videoSitemapsByFile.keys()].map(async (siteMapFile) => {
          try {
            const videoSitemaps = videoSitemapsByFile.get(siteMapFile);
            await this.videoSitemapsProcessorService.newLinksHandler(
              {
                fileName: siteMapFile,
                indexName: this.sitemapIndexService.getIndexFileName(
                  SitemapFileEntityType.VIDEO,
                  sitemapFileNameIncrementHM.get(siteMapFile),
                ),
              },
              videoSitemaps,
            );
          } catch (e) {
            this.logger.error({
              message: 'Error while processing new video Sitemap links',
              modulusHashValue,
            });
            this.logger.error(e);
          }
        }),
      );
    } catch (err) {
      this.logger.error({
        message: 'Error while processing new video sitemap links',
      });
      this.logger.error(err);
    }
  }

  @Cron('0 0 * * * *') // every hour at the start
  async processNewVideoSitemapLinksForModulusHashValueZero() {
    await this.newVideoSitemapsLinksProcessHandler(0);
  }

  @Cron('0 5 * * * *') // every hour at the start of 5th minute
  async processNewVIdeoSitemapLinksForModulusHashValueOne() {
    await this.newVideoSitemapsLinksProcessHandler(1);
  }

  @Cron('0 10 * * * *') // every hour at the start of 10th minute
  async processNewVIdeoSitemapLinksForModulusHashValueTwo() {
    await this.newVideoSitemapsLinksProcessHandler(2);
  }
  @Cron('0 15 * * * *') // every hour at the start of 15th minute
  async processNewVIdeoSitemapLinksForModulusHashValueOThree() {
    await this.newVideoSitemapsLinksProcessHandler(3);
  }
  @Cron('0 20 * * * *') // every hour at the start of 20th minute
  async processNewVIdeoSitemapLinksForModulusHashValueFour() {
    await this.newVideoSitemapsLinksProcessHandler(4);
  }
  @Cron('0 25 * * * *') // every hour at the start of 25th minute
  async processNewVIdeoSitemapLinksForModulusHashValueFive() {
    await this.newVideoSitemapsLinksProcessHandler(5);
  }
  @Cron('0 30 * * * *') // every hour at the start of 30th minute
  async processNewVIdeoSitemapLinksForModulusHashValueSix() {
    await this.newVideoSitemapsLinksProcessHandler(6);
  }
  @Cron('0 35 * * * *') // every hour at the start of 35th minute
  async processNewVIdeoSitemapLinksForModulusHashValueSeven() {
    await this.newVideoSitemapsLinksProcessHandler(7);
  }
  @Cron('0 40 * * * *') // every hour at the start of 40th minute
  async processNewVIdeoSitemapLinksForModulusHashValueEight() {
    await this.newVideoSitemapsLinksProcessHandler(8);
  }
  @Cron('0 45 * * * *') // every hour at the start of 45th minute
  async processNewVIdeoSitemapLinksForModulusHashValueNine() {
    await this.newVideoSitemapsLinksProcessHandler(9);
  }
}
