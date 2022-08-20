import { MiddlewareConsumer, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import config from './config';
import { validate } from './env.validation';
import { AppLoggerMiddleware } from './app-logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { LocksModule } from './locks/locks.module';
import { AwsS3Module } from './s3/s3.module';
import { TextSitemapsModule } from './text-sitemaps/text-sitemaps.module';
import { SitemapsModule } from './sitemaps/sitemaps.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
      cache: true,
      validate,
    }),
    WinstonModule.forRoot({
      level: 'debug',
      transports: [
        new winston.transports.Console({ format: winston.format.json() }),
      ],
    }),
    ScheduleModule.forRoot(),
    AwsS3Module,
    LocksModule,
    TextSitemapsModule,
    SitemapsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppLoggerMiddleware).forRoutes('*');
  }
}
