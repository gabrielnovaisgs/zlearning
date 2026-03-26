import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pglite = new PGlite('./docs/chat/chat.db');
    const adapter = new PrismaPGlite(pglite);
    // `as any` is required: Prisma 7 driver adapter constructor overload is not
    // resolved correctly through class inheritance by TypeScript.
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
