import {
  Controller,
  Get,
  Param,
  Response,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response as ResponseType } from 'express';
import { ApiTags } from '@nestjs/swagger';
import * as getRawBody from 'raw-body';
import { Readable } from 'stream';
import { ServeSitemap } from './dto/sitemap-controller.dto';
import { SitemapsIndexService } from './sitemaps-index.service';
import { SitemapsService } from './sitemaps.service';
import { AwsS3Service } from './../s3/aws-s3.service';

@ApiTags('sitemaps')
@Controller('sitemaps')
export class SitemapsController {
  private readonly logger: Logger = new Logger(SitemapsController.name);
  private readonly responseContentType = 'application/xml';
  private readonly responseContentEncoding = 'gzip';

  constructor(
    private readonly sitemapsIndexService: SitemapsIndexService,
    private readonly sitemapsService: SitemapsService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Get('index/:sitemap')
  async serveSitemapIndexFile(
    @Param() params: ServeSitemap,
    @Response() res: ResponseType,
  ): Promise<ResponseType> {
    try {
      const { sitemap } = params;

      const indexFile = await this.sitemapsIndexService.retrieveByFileName(
        sitemap,
      );
      if (!indexFile) {
        throw new NotFoundException(
          {
            message: `Sitemap index file: ${sitemap} not found`,
            error: 'Not Found',
          },
          'Not found',
        );
      }

      const { s3Key } = this.sitemapsIndexService.getIndexFileS3KeyAndLocation({
        fileName: indexFile.fileName,
        entityType: indexFile.entityType,
      });

      const stream = await this.awsS3Service
        .getObject({
          Key: s3Key,
        })
        .catch((err) => {
          if (err.$response.statusCode !== 404) {
            throw err;
          }
        });

      if (!stream) {
        throw new NotFoundException(
          {
            message: `Sitemap index file: ${sitemap} not found`,
            error: 'Not Found',
          },
          'Not found',
        );
      }

      const gzipSitemapXML = await getRawBody(stream.Body as Readable);
      res.set({
        'Content-Type': this.responseContentType,
        'Content-Encoding': this.responseContentEncoding,
      });
      return res.status(200).send(gzipSitemapXML);
    } catch (err) {
      this.logger.error({
        message: 'Failed to serve sitemap index',
        params,
        err,
      });

      throw err;
    }
  }

  @Get('sitemap/:sitemap')
  async serveSitemapFile(
    @Param() params: ServeSitemap,
    @Response() res: ResponseType,
  ): Promise<ResponseType> {
    try {
      const { sitemap } = params;

      const sitemapFile = await this.sitemapsService.findUnique(sitemap);
      if (!sitemapFile) {
        throw new NotFoundException(
          {
            message: `Sitemap file: ${sitemap} not found`,
            error: 'Not Found',
          },
          'Not found',
        );
      }

      const { s3Key } = this.sitemapsService.getSitemapFileS3KeyAndLocation(
        sitemapFile.entityType,
        sitemapFile.fileName,
      );

      const stream = await this.awsS3Service
        .getObject({
          Key: s3Key,
        })
        .catch((err) => {
          if (err.$response.statusCode !== 404) {
            throw err;
          }
        });

      if (!stream) {
        throw new NotFoundException(
          {
            message: `Sitemap file: ${sitemap} not found`,
            error: 'Not Found',
          },
          'Not found',
        );
      }

      const gzipSitemapXML = await getRawBody(stream.Body as Readable);
      res.set({
        'Content-Type': this.responseContentType,
        'Content-Encoding': this.responseContentEncoding,
      });
      return res.send(gzipSitemapXML);
    } catch (err) {
      this.logger.error({
        message: 'Failed to serve sitemap',
        params,
        err,
      });

      throw err;
    }
  }
}
