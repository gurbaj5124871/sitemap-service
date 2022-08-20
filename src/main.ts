import { ConfigType } from './config';
import { VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: true,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const configService: ConfigService<ConfigType> = app.get(ConfigService);

  if (configService.get('enableApiDocs')) {
    const config = new DocumentBuilder()
      .setTitle('Sitemap Service')
      .setDescription('Service that handles sitemaps')
      .addTag('sitemaps')
      .addBasicAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(configService.get('port'));

  const logger = new Logger(`Bootstrap`);

  process.on('unhandledRejection', (err) => {
    logger.error({
      err,
    });
  });
  process.on('uncaughtException', (err) => {
    logger.error({
      err,
    });
  });
}

bootstrap();
