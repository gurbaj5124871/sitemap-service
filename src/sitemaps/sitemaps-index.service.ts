import { Injectable } from '@nestjs/common';
import {
  parseSitemapIndex,
  SitemapIndexStream,
  streamToPromise,
} from 'sitemap';
import { Readable } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import {
  SitemapFile,
  SitemapFileLifeCycle,
  SitemapFileEntityType,
  SitemapIndexFile,
  SitemapIndexFileLifeCycle,
} from '@prisma/client';
import { StringStream } from 'scramjet';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../config';
import { PrismaService } from '../prisma.service';
import { LocksService } from '../locks/locks.service';
import { AwsS3Service } from './../s3/aws-s3.service';

@Injectable()
export class SitemapsIndexService {
  private readonly sitemapLocationBaseUrl: string;
  private readonly frontendDomain: string;

  constructor(
    private readonly configService: ConfigService<ConfigType>,
    private readonly prisma: PrismaService,
    private readonly locksService: LocksService,
    private readonly awsS3Service: AwsS3Service,
  ) {
    this.sitemapLocationBaseUrl = `https://${configService.get(
      'sitemapS3OutputBucket',
    )}.s3.amazonaws.com`;
    this.frontendDomain = configService.get('frontendDomain');
  }

  getIndexFileName(
    entityType: SitemapFileEntityType,
    sitemapFileIncrement: number,
  ) {
    const sitemapIndexFileMaxLimit = this.configService.get(
      'sitemapIndexFileLimit',
    );
    const indexFileIncrement = Math.ceil(
      sitemapFileIncrement / sitemapIndexFileMaxLimit,
    );

    switch (entityType) {
      case SitemapFileEntityType.TEXT:
        return `text-sitemaps-index-${indexFileIncrement}`;
      case SitemapFileEntityType.VIDEO:
        return `vide-sitemaps-index-${indexFileIncrement}`;
      default:
        throw new Error(
          `Unsupported ${entityType} for fetching sitemap index file name`,
        );
    }
  }

  getIndexFileS3KeyAndLocation(args: {
    fileName: string;
    entityType: SitemapFileEntityType;
  }) {
    switch (args.entityType) {
      case SitemapFileEntityType.TEXT:
        return {
          s3Key: `text-sitemaps/${args.fileName}`,
          s3Location: `${this.sitemapLocationBaseUrl}/text-sitemaps/${args.fileName}`,
        };
      case SitemapFileEntityType.VIDEO:
        return {
          s3Key: `video-sitemaps/${args.fileName}`,
          s3Location: `${this.sitemapLocationBaseUrl}/video-sitemaps/${args.fileName}`,
        };
      default:
        throw new Error(
          `Index file for entity ${args.entityType} not supported`,
        );
    }
  }

  getIndexFileServingURL(args: {
    fileName: string;
    entityType: SitemapFileEntityType;
  }) {
    return `${this.frontendDomain}/sitemaps/index/${args.fileName}`;
  }

  getRobotsDotTxtS3KeyAndLocation() {
    return {
      s3Key: `robots.txt`,
      s3Location: `${this.sitemapLocationBaseUrl}/robots.txt`,
    };
  }

  retrieveByFileName(fileName: string) {
    return this.prisma.sitemapIndexFile.findUnique({
      where: {
        fileName,
      },
      rejectOnNotFound: false,
    });
  }

  fetchIndexFilesForRobotsDotTxtLinking() {
    return this.prisma.sitemapIndexFile.findMany({
      where: {
        lifeCycle: SitemapIndexFileLifeCycle.UPLOADED,
      },
    });
  }

  markIndexFileAsUploaded(indexFileNames: string[]) {
    return this.prisma.sitemapIndexFile.updateMany({
      where: {
        fileName: {
          in: indexFileNames,
        },
      },
      data: {
        lifeCycle: SitemapIndexFileLifeCycle.LINKED_TO_ROBOTS_DOT_TXT,
      },
    });
  }

  markIndexFilesAsLinkedToRobotsDotTxt(indexFileNames: string[]) {
    return this.prisma.sitemapIndexFile.updateMany({
      where: {
        fileName: {
          in: indexFileNames,
        },
      },
      data: {
        lifeCycle: SitemapIndexFileLifeCycle.LINKED_TO_ROBOTS_DOT_TXT,
      },
    });
  }

  async ensureIndexFileExistence(args: {
    indexFileName: string;
    entityType: SitemapFileEntityType;
  }) {
    const indexFileExistenceStatue = await this.retrieveByFileName(
      args.indexFileName,
    );

    // create new index file
    if (!indexFileExistenceStatue) {
      let lockKeyAcquired: string | undefined = undefined;
      try {
        lockKeyAcquired = await this.locksService.acquireLock(
          args.indexFileName,
        );

        const sitemapIndexEmptyTemplate = await this.awsS3Service.getObject({
          Key: `sitemap-index-empty-template.xml`,
        });
        const compressedSitemapIndexXML = await streamToPromise(
          (sitemapIndexEmptyTemplate.Body as Readable).pipe(createGzip()),
        );

        const { s3Key, s3Location } = this.getIndexFileS3KeyAndLocation({
          fileName: args.indexFileName,
          entityType: args.entityType,
        });
        const contentType = 'application/xml';
        const contentEncoding = 'gzip';
        await this.awsS3Service.uploadToS3(
          {
            name: s3Key,
            body: compressedSitemapIndexXML,
          },
          {
            contentType,
            contentEncoding,
          },
        );

        await this.prisma.sitemapIndexFile.create({
          data: {
            fileName: args.indexFileName,
            link: this.getIndexFileServingURL({
              fileName: args.indexFileName,
              entityType: args.entityType,
            }),
            location: s3Location,
            entityType: args.entityType,
            lifeCycle: SitemapFileLifeCycle.UPLOADED,
          },
        });
      } finally {
        if (lockKeyAcquired) {
          await this.locksService.releaseLock(args.indexFileName);
        }
      }
    }
  }

  async linkNewSitemapsToIndex(args: {
    indexFileName: string;
    entityType: SitemapFileEntityType;
    sitemaps: SitemapFile[];
  }) {
    const { indexFileName, entityType, sitemaps } = args;
    const { s3Key } = this.getIndexFileS3KeyAndLocation({
      fileName: indexFileName,
      entityType: entityType,
    });

    const indexFileResp = await this.awsS3Service.getObject({
      Key: s3Key,
    });

    const sitemapLinks = await parseSitemapIndex(
      (indexFileResp.Body as Readable).pipe(createGunzip()),
    );
    sitemaps.forEach((sitemap) => {
      sitemapLinks.push({
        url: sitemap.link,
        lastmod: sitemap.createdAt.toISOString(),
      });
    });
    const indexStream = new SitemapIndexStream({});
    const compressedSitemapIndexXML = await streamToPromise(
      Readable.from(sitemapLinks).pipe(indexStream).pipe(createGzip()),
    );

    const contentType = 'application/xml';
    const contentEncoding = 'gzip';
    await this.awsS3Service.uploadToS3(
      {
        name: s3Key,
        body: compressedSitemapIndexXML,
      },
      {
        contentType,
        contentEncoding,
      },
    );

    await this.prisma.sitemapFile.updateMany({
      where: {
        fileName: {
          in: sitemaps.map((file) => file.fileName),
        },
      },
      data: {
        lifeCycle: SitemapFileLifeCycle.LINKED_TO_INDEX,
      },
    });
  }

  async updateLastModForSitemapsInIndex(args: {
    indexFileName: string;
    entityType: SitemapFileEntityType;
    sitemaps: SitemapFile[];
  }) {
    const { indexFileName, entityType, sitemaps } = args;
    const sitemapHash = new Map<string, SitemapFile>();
    sitemaps.forEach((sitemap) => {
      sitemapHash.set(sitemap.link, sitemap);
    });

    const { s3Key } = this.getIndexFileS3KeyAndLocation({
      fileName: indexFileName,
      entityType: entityType,
    });

    const indexFileResp = await this.awsS3Service.getObject({
      Key: s3Key,
    });

    const sitemapLinks = await parseSitemapIndex(
      (indexFileResp.Body as Readable).pipe(createGunzip()),
    );

    sitemapLinks.forEach((sitemapLink) => {
      const match = sitemapHash.get(sitemapLink.url);
      if (match) {
        sitemapLink.lastmod = match.updatedAt.toISOString();
      }
    });

    const indexStream = new SitemapIndexStream({});
    const compressedSitemapIndexXML = await streamToPromise(
      Readable.from(sitemapLinks).pipe(indexStream).pipe(createGzip()),
    );

    const contentType = 'application/xml';
    const contentEncoding = 'gzip';
    await this.awsS3Service.uploadToS3(
      {
        name: s3Key,
        body: compressedSitemapIndexXML,
      },
      {
        contentType,
        contentEncoding,
      },
    );

    /**
     * update the sitemap files life cycle back to linked to index
     */
    await this.prisma.sitemapFile.updateMany({
      where: {
        fileName: {
          in: sitemaps.map((file) => file.fileName),
        },
      },
      data: {
        lifeCycle: SitemapFileLifeCycle.LINKED_TO_INDEX,
      },
    });
  }

  async linkNexIndexFilesToRobotsDotTxt(indexFiles: SitemapIndexFile[]) {
    const indexFileNames: string[] = [];
    const indexFilesByLinkHashMap = new Map<string, null>();
    indexFiles.forEach((indexFile) => {
      indexFileNames.push(indexFile.fileName);
      indexFilesByLinkHashMap.set(indexFile.link, null);
    });

    const { s3Key } = this.getRobotsDotTxtS3KeyAndLocation();
    const robotsDotTxt = await this.awsS3Service.getObject({
      Key: s3Key,
    });

    const lines = await (robotsDotTxt.Body as Readable)
      .pipe(new StringStream())
      .lines()
      .map((line: string) => {
        if (line.startsWith('Sitemap:')) {
          const link = line.split(' ').pop();
          indexFilesByLinkHashMap.delete(link);
        }
        return line;
      })
      .toArray();
    [...indexFilesByLinkHashMap.keys()].map((indexFileLink) => {
      lines.push(`Sitemap: ${indexFileLink}`);
    });

    await this.awsS3Service.uploadToS3(
      {
        name: s3Key,
        body: lines.join('\n'),
      },
      {
        contentType: 'text/plain',
      },
    );

    await this.markIndexFilesAsLinkedToRobotsDotTxt(indexFileNames);
  }
}
