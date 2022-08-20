import { Injectable } from '@nestjs/common';
import {
  SitemapFile,
  SitemapFileEntityType,
  SitemapFileLifeCycle,
} from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../config';
import { DeployEnvironment } from '../env.validation';

@Injectable()
export class SitemapsService {
  private readonly sitemapLocationBaseUrl: string;
  private readonly frontendDomain: string;

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    this.sitemapLocationBaseUrl = `https://${configService.get(
      'sitemapS3OutputBucket',
    )}.s3.amazonaws.com`;
    this.frontendDomain = configService.get('frontendDomain');
  }

  getSitemapFileName(
    entityType: SitemapFileEntityType,
    fileArgs: {
      counter: number;
      modulusHashBase: number;
      modulusHashValue: number;
    },
  ) {
    const sitemapFileMaxLimit = this.configService.get('sitemapFileMaxLimit');
    const fileIncrement = Math.ceil(fileArgs.counter / sitemapFileMaxLimit);

    const sitemapFileName = (() => {
      switch (entityType) {
        case SitemapFileEntityType.TEXT:
          return `text-sitemap-${fileArgs.modulusHashBase}-${fileArgs.modulusHashValue}-${fileIncrement}`;
        case SitemapFileEntityType.VIDEO:
          return `video-sitemap-${fileArgs.modulusHashBase}-${fileArgs.modulusHashValue}-${fileIncrement}`;
        default:
          throw new Error(
            `Unsupported ${entityType} for fetching sitemap file name`,
          );
      }
    })();

    return {
      fileName: sitemapFileName,
      fileIncrement,
    };
  }

  getSitemapFileS3KeyAndLocation(
    entityType: SitemapFileEntityType,
    fileName: string,
  ) {
    switch (entityType) {
      case SitemapFileEntityType.TEXT:
        return {
          s3Key: `text-sitemaps/${fileName}`,
          s3Location: `${this.sitemapLocationBaseUrl}/text-sitemaps/${fileName}`,
        };
      case SitemapFileEntityType.VIDEO:
        return {
          s3Key: `video-sitemaps/${fileName}`,
          s3Location: `${this.sitemapLocationBaseUrl}/video-sitemaps/${fileName}`,
        };
      default:
        throw new Error(
          `Entity type ${entityType} is not supported yet while requesting s3 key and location`,
        );
    }
  }

  getSitemapFileServingURL(args: {
    fileName: string;
    entityType: SitemapFileEntityType;
  }) {
    return `${this.frontendDomain}/sitemaps/sitemap/${args.fileName}`;
  }

  findUnique(fileName: string) {
    return this.prisma.sitemapFile.findUnique({
      where: {
        fileName,
      },
      rejectOnNotFound: false,
    });
  }

  fetchSitemapFilesForIndexLinking(entityType: SitemapFileEntityType) {
    return this.prisma.sitemapFile.findMany({
      where: {
        lifeCycle: SitemapFileLifeCycle.UPLOADED,
        entityType,
      },
    });
  }

  updateSitemapFileMarkedAsLinkedToIndex(fileName: string) {
    return this.prisma.sitemapFile.update({
      where: {
        fileName,
      },
      data: {
        lifeCycle: SitemapFileLifeCycle.LINKED_TO_INDEX,
      },
    });
  }

  updateSitemapFileMarkedAsLastMod(fileName: string) {
    return this.prisma.sitemapFile.update({
      where: {
        fileName,
      },
      data: {
        lifeCycle: SitemapFileLifeCycle.MARKED_FOR_INDEX_LASTMOD_UPDATE,
      },
    });
  }

  fetchSitemapFilesForLastModUpdate(entityType: SitemapFileEntityType) {
    return this.prisma.sitemapFile.findMany({
      where: {
        lifeCycle: SitemapFileLifeCycle.MARKED_FOR_INDEX_LASTMOD_UPDATE,
        entityType,
      },
    });
  }

  /**
   * Pinging google with sitemap should only be performed for production
   */
  async pingGoogleToCrawlSitemap(sitemap: SitemapFile) {
    if (this.configService.get('deployEnv') !== DeployEnvironment.Prod) {
      return;
    }

    const response$ = this.httpService.get(
      `https://www.google.com/ping?sitemap=${sitemap.link}`,
    );
    const { data } = await lastValueFrom(response$);
    return data;
  }
}
