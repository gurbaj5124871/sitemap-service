import { Injectable, Logger } from '@nestjs/common';
import { SitemapDeletionCycle } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { KafkaTextSitemapEventMessage } from './dto/text-sitemaps-kafka.dto';

@Injectable()
export class TextSitemapsService {
  private readonly logger: Logger = new Logger(TextSitemapsService.name);

  constructor(private prisma: PrismaService) {}

  private getModulusTenHash(id: string) {
    return {
      modulusHashBase: 10,
      modulusHashValue: Number(BigInt(id) % BigInt(10)),
    };
  }

  async create(
    data: Pick<
      KafkaTextSitemapEventMessage['textSitemap'],
      'id' | 'url' | 'isIgnored' | 'isDeleted'
    >,
  ) {
    const { modulusHashBase, modulusHashValue } = this.getModulusTenHash(
      data.id,
    );

    await this.prisma
      .$transaction(async (prisma) => {
        const textSitemapCounter =
          await prisma.textSitemapModulusCounter.upsert({
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

        return prisma.textSitemap.create({
          data: {
            id: BigInt(data.id),
            link: data.url,
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
          message: 'Error while creating text sitemap link',
          error: err,
          data,
        });

        // If the text sitemap link already exists, we don't want to retry
        if (err.code !== 'P2002') {
          throw err;
        }
      });
  }

  async delete(
    data: Pick<
      KafkaTextSitemapEventMessage['textSitemap'],
      'id' | 'url' | 'isIgnored' | 'isDeleted'
    >,
  ) {
    return this.prisma.textSitemap.updateMany({
      where: {
        id: BigInt(data.id),
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

  getUnprocessedTextSitemapLinks(filters?: {
    modulus?: {
      modulusHashBase: number;
      modulusHashValue: number[];
    };
  }) {
    return this.prisma.textSitemap.findMany({
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

  getMarkedForDeletionTextSitemapsLinks() {
    return this.prisma.textSitemap.findMany({
      where: {
        isDeleted: true,
        sitemapDeletionCycle: SitemapDeletionCycle.MARKED_FOR_DELETION,
      },
    });
  }

  updateTextSitemapsMarkedForDeletionAsDeleted(ids: bigint[]) {
    return this.prisma.textSitemap.updateMany({
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
