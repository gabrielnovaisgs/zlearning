import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from "@prisma/adapter-pg";
const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../prisma/migrations',
);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pglite: PGlite | null;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      const pglite = new PGlite('./docs/chat/chat.db');
      const adapter = new PrismaPGlite(pglite);

      super({ adapter });
      this.pglite = pglite;
    } else {
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
      super({ adapter });
      this.pglite = null;
    }
  }

  async onModuleInit() {
    await this.$connect();
    if (this.pglite) await this.applyMigrations();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async applyMigrations() {
    await this.pglite!.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                  VARCHAR(36)  NOT NULL PRIMARY KEY,
        "checksum"            VARCHAR(64)  NOT NULL,
        "finished_at"         TIMESTAMPTZ,
        "migration_name"      VARCHAR(255) NOT NULL,
        "logs"                TEXT,
        "rolled_back_at"      TIMESTAMPTZ,
        "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER      NOT NULL DEFAULT 0
      )
    `);

    const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
    const migrationDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    for (const name of migrationDirs) {
      const already = await this.pglite!.query<{ id: string }>(
        `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
        [name],
      );
      if (already.rows.length > 0) continue;

      const sql = await readFile(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf-8');
      await this.pglite!.exec(sql);
      await this.pglite!.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), 1)`,
        [randomUUID(), '0', name],
      );
    }
  }
}
