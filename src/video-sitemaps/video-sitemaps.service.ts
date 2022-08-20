import { Injectable, Logger } from '@nestjs/common';
import { SitemapDeletionCycle } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { KafkaVideoSitemapEventMessage } from './dto/video-sitemaps-kafka.dto';

@Injectable()
export class VideoSitemapsService {
  private readonly logger: Logger = new Logger(VideoSitemapsService.name);

  constructor(private prisma: PrismaService) {}

  private getModulusTenHash(id: number) {
    return {
      modulusHashBase: 10,
      modulusHashValue: Number(BigInt(id) % BigInt(10)),
    };
  }

  async create(data: KafkaVideoSitemapEventMessage['videoSitemap']) {
    const { modulusHashBase, modulusHashValue } = this.getModulusTenHash(
      data.id,
    );

    await this.prisma
      .$transaction(async (prisma) => {
        const textSitemapCounter =
          await prisma.videoSitemapModulusCounter.upsert({
            where: {
              id: modulusHashValue,
            },
            create: {
              id: modulusHashValue,
              counter: 1,
            },
            update: {
              counter: { increment: 1 },
            },
          });

        return prisma.videoSitemap.create({
          data: {
            id: data.id,
            link: data.link,
            videoURL: data.videoURL,
            title: data.title,
            description: data.description,
            thumbnail: data.thumbnail,
            startTimestamp: data.startTimestamp,
            endTimestamp: data.endTimestamp,
            actualDurationInSeconds: data.actualDurationInSeconds,
            modulusHashBase,
            modulusHashValue,
            counter: textSitemapCounter.counter,
            isIgnored: data.isIgnored,
            isDeleted: data.isDeleted,
          },
        });
      })
      .catch((err) => {
        this.logger.error({
          message: 'Error while creating video sitemap link',
          error: err,
          data,
        });

        // If the text sitemap link already exists, we don't want to retry
        if (err.code !== 'P2002') {
          throw err;
        }
      });
  }

  update(data: KafkaVideoSitemapEventMessage['videoSitemap']) {
    return this.prisma.videoSitemap.updateMany({
      where: {
        id: data.id,
        isDeleted: false,
      },
      data: {
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        ...(!data.isIgnored && { isMarkedForUpdate: true }),
      },
    });
  }

  delete(data: KafkaVideoSitemapEventMessage['videoSitemap']) {
    return this.prisma.videoSitemap.updateMany({
      where: {
        id: data.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        sitemapDeletionCycle: data.isIgnored
          ? SitemapDeletionCycle.DELETED
          : SitemapDeletionCycle.MARKED_FOR_DELETION,
      },
    });
  }

  getUnprocessedVideoSitemapsLinks(filters?: {
    modulus?: {
      modulusHashBase: number;
      modulusHashValue: number[];
    };
  }) {
    return this.prisma.videoSitemap.findMany({
      where: {
        fileName: null,
        isDeleted: false,
        isIgnored: false,
        ...(filters?.modulus?.modulusHashValue.length && {
          modulusHashBase: filters.modulus.modulusHashBase,
          modulusHashValue: {
            in: filters.modulus.modulusHashValue,
          },
        }),
      },
      orderBy: {
        counter: 'asc',
      },
      take: 50,
    });
  }

  getMarkedForUpdateVideoSitemapLinks() {
    return this.prisma.videoSitemap.findMany({
      where: {
        isDeleted: true,
        isMarkedForUpdate: true,
      },
    });
  }

  unsetMarkedForUpdateForVideoSitemaps(ids: number[]) {
    return this.prisma.videoSitemap.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        isMarkedForUpdate: false,
      },
    });
  }

  getMarkedForDeletionVideoSitemapLinks() {
    return this.prisma.videoSitemap.findMany({
      where: {
        isDeleted: true,
        sitemapDeletionCycle: SitemapDeletionCycle.MARKED_FOR_DELETION,
      },
    });
  }

  updateVideoSitemapsMarkedForDeletionAsDeleted(ids: number[]) {
    return this.prisma.videoSitemap.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        sitemapDeletionCycle: SitemapDeletionCycle.DELETED,
      },
    });
  }
}
