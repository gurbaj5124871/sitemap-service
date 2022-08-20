import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '../config';

@Injectable()
export class AwsS3Service {
  private readonly logger: Logger = new Logger(AwsS3Service.name);
  private readonly client: S3Client = new S3Client({ region: 'us-east-1' });
  private readonly outputBucket: string;

  constructor(configService: ConfigService<ConfigType>) {
    this.outputBucket = configService.get('sitemapS3OutputBucket');
  }

  async uploadToS3(
    upload: {
      name: string;
      body: Buffer | string;
    },
    options: {
      contentType: string;
      contentEncoding?: string;
    },
  ) {
    return this.client.send(
      new PutObjectCommand({
        Bucket: this.outputBucket,
        Key: upload.name,
        Body: upload.body,
        ContentType: options.contentType,
        ...(options.contentEncoding && {
          ContentEncoding: options.contentEncoding,
        }),
      }),
    );
  }

  async getObject(
    args: Pick<
      GetObjectCommandInput,
      'Key' | 'ResponseContentEncoding' | 'ResponseContentType'
    >,
  ) {
    return this.client.send(
      new GetObjectCommand({
        ...args,
        Bucket: this.outputBucket,
      }),
    );
  }
}
