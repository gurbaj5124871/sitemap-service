import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LocksService } from './locks.service';

@Module({
  providers: [PrismaService, LocksService],
  exports: [LocksService],
})
export class LocksModule {}
