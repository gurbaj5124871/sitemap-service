import {
  Controller,
  Get,
  Response,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response as ResponseType } from 'express';
import * as getRawBody from 'raw-body';
import { Readable } from 'stream';
import { AppService } from './app.service';
import { SitemapsIndexService } from './sitemaps/sitemaps-index.service';
import { AwsS3Service } from './s3/aws-s3.service';

@Controller()
export class AppController {
  private readonly logger: Logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly sitemapsIndexService: SitemapsIndexService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/robots.txt')
  async serveRobotsDotTxt(
    @Response() res: ResponseType,
  ): Promise<ResponseType> {
    try {
      const { s3Key } =
        this.sitemapsIndexService.getRobotsDotTxtS3KeyAndLocation();
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
            message: `robots.txt not found`,
            error: 'Not Found',
          },
          'Not found',
        );
      }

      const text = await getRawBody(stream.Body as Readable);
      const contentType = 'text/plain';
      res.set({
        'Content-Type': contentType,
      });
      return res.send(text);
    } catch (err) {
      this.logger.error({
        message: 'Failed to serve robots.txt',
        err,
      });

      throw err;
    }
  }
}
