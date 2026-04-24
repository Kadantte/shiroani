import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { createLogger } from '@shiroani/shared';
import { runMigrations } from './migrations';
import { DATABASE_PATH } from './database.tokens';

const logger = createLogger('DatabaseService');

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private _db!: Database.Database;

  constructor(@Inject(DATABASE_PATH) private readonly dbPath: string) {}

  /** Expose the raw better-sqlite3 instance for other services. */
  get db(): Database.Database {
    return this._db;
  }

  onModuleInit(): void {
    logger.info(`Opening database at ${this.dbPath}`);

    this._db = new Database(this.dbPath);

    // Performance and safety pragmas
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
    this._db.pragma('busy_timeout = 5000');
    this._db.pragma('synchronous = NORMAL');

    runMigrations(this._db);

    logger.info('Database initialized successfully');
  }

  onModuleDestroy(): void {
    if (this._db) {
      this._db.close();
      logger.info('Database connection closed');
    }
  }
}
