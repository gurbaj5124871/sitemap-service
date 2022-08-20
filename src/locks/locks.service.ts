import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export class FailedToAcquireLockError extends Error {}

// TODO: this could be refactored into a decorator
@Injectable()
export class LocksService {
  private readonly LOCK_EXPIRY_IN_MINS = 15;

  constructor(private prisma: PrismaService) {}

  async acquireLock(
    key: string,
    timeoutInMins: number = this.LOCK_EXPIRY_IN_MINS,
  ) {
    try {
      await this.prisma.jobLock.create({ data: { key } });
      return key;
    } catch (err) {
      // rethrow errors that are not related to duplicate PK
      if (err.code !== 'P2002') {
        throw err;
      }

      const lock = await this.prisma.jobLock.findUnique({ where: { key } });

      if (lock !== null) {
        const diffInMs = new Date().getTime() - lock.createdAt.getTime();
        const diffInMins = diffInMs / 1000 / 60;

        if (diffInMins < timeoutInMins) {
          throw new FailedToAcquireLockError();
        } else {
          await this.releaseLock(key);
        }
      }

      return this.acquireLock(key);
    }
  }

  async releaseLock(key: string) {
    try {
      await this.prisma.jobLock.delete({ where: { key } });
    } catch (err) {
      if (err.code !== 'P2025') {
        throw err;
      }
    }
    return key;
  }
}
