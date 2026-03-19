#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const help = args.includes('--help') || args.includes('-h');
const mode = args.find(arg => arg === 'feed' || arg === 'full') ?? 'feed';

function readFlagValue(flagName) {
  const index = args.indexOf(flagName);
  if (index === -1) return null;

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flagName}`);
  }

  return value;
}

function usage() {
  console.log(`Usage: node scripts/reset-feed-db.mjs [feed|full] [--db <path>] [--dry-run]

Modes:
  feed  Clear fetched RSS items and reset source fetch metadata
  full  Clear RSS items and sources so defaults are re-seeded on next app start

Options:
  --db <path>   Override the SQLite database path
  --dry-run     Show what would be reset without modifying the database

Environment:
  SHIROANI_DB_PATH  Override the SQLite database path
`);
}

function getConfigRoot() {
  switch (platform()) {
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support');
    case 'win32':
      return process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');
    default:
      return process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  }
}

function getCandidatePaths() {
  const base = getConfigRoot();
  return [
    join(base, '@shiroani', 'desktop', 'shiroani.db'),
    join(base, 'ShiroAni', 'shiroani.db'),
    join(base, 'shiroani', 'shiroani.db'),
    join(base, 'desktop', 'shiroani.db'),
  ];
}

function resolveDbPath() {
  const explicitPath = readFlagValue('--db') ?? process.env.SHIROANI_DB_PATH;
  if (explicitPath) {
    return resolve(explicitPath);
  }

  const match = getCandidatePaths().find(candidate => existsSync(candidate));
  if (match) {
    return match;
  }

  throw new Error(
    `Could not find shiroani.db. Checked:\n${getCandidatePaths()
      .map(candidate => `  - ${candidate}`)
      .join('\n')}\n\nPass --db <path> or set SHIROANI_DB_PATH.`
  );
}

function getCounts(db) {
  const existingTables = db.scalar(`
    SELECT COUNT(*)
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('feed_sources', 'feed_items')
  `);

  if (existingTables !== 2) {
    return null;
  }

  return {
    items: db.scalar('SELECT COUNT(*) FROM feed_items'),
    sources: db.scalar('SELECT COUNT(*) FROM feed_sources'),
  };
}

function normalizeSqliteError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('database is locked')) {
    return new Error('Database is locked. Quit ShiroAni before running this script.');
  }

  return error instanceof Error ? error : new Error(message);
}

function createSqliteCliDriver(dbPath) {
  try {
    execFileSync('sqlite3', ['-version'], { stdio: 'ignore' });
  } catch {
    return null;
  }

  const scalar = sql => {
    try {
      const output = execFileSync('sqlite3', ['-cmd', '.timeout 5000', dbPath, sql], {
        encoding: 'utf8',
      }).trim();
      return Number(output || '0');
    } catch (error) {
      throw normalizeSqliteError(error);
    }
  };

  return {
    scalar,
    exec: sql => {
      try {
        execFileSync('sqlite3', ['-cmd', '.timeout 5000', dbPath, sql], { stdio: 'inherit' });
      } catch (error) {
        throw normalizeSqliteError(error);
      }
    },
    close: () => {},
  };
}

function createBetterSqliteDriver(dbPath) {
  try {
    const requireFromDesktop = createRequire(resolve(root, 'apps/desktop/package.json'));
    const Database = requireFromDesktop('better-sqlite3');
    const db = new Database(dbPath);

    return {
      scalar: sql => {
        const row = db.prepare(sql).get();
        return Number(Object.values(row)[0] ?? 0);
      },
      exec: sql => {
        db.exec(sql);
      },
      close: () => {
        db.close();
      },
    };
  } catch {
    return null;
  }
}

function openDatabase(dbPath) {
  const sqliteCliDriver = createSqliteCliDriver(dbPath);
  if (sqliteCliDriver) {
    return sqliteCliDriver;
  }

  const betterSqliteDriver = createBetterSqliteDriver(dbPath);
  if (betterSqliteDriver) {
    return betterSqliteDriver;
  }

  throw new Error(
    'Could not open the database. Install the sqlite3 CLI or rebuild better-sqlite3 for the current Node.js version.'
  );
}

function run() {
  if (help) {
    usage();
    process.exit(0);
  }

  const dbPath = resolveDbPath();

  try {
    const db = openDatabase(dbPath);
    const before = getCounts(db);

    if (!before) {
      console.log(`Feed tables not found in ${dbPath}. Nothing to reset.`);
      db.close();
      return;
    }

    console.log(`Database: ${dbPath}`);
    console.log(`Mode: ${mode}`);
    console.log(`Current feed rows: ${before.items} items, ${before.sources} sources`);

    if (dryRun) {
      if (mode === 'feed') {
        console.log('Dry run: would clear feed_items and reset feed_sources fetch metadata.');
      } else {
        console.log('Dry run: would clear feed_items and delete feed_sources.');
      }
      db.close();
      return;
    }

    if (mode === 'full') {
      db.exec(`
        BEGIN;
        DELETE FROM feed_items;
        DELETE FROM feed_sources;
        COMMIT;
      `);
    } else {
      db.exec(`
        BEGIN;
        DELETE FROM feed_items;
        UPDATE feed_sources
        SET last_fetched_at = NULL,
            consecutive_failures = 0,
            last_error = NULL,
            last_etag = NULL;
        COMMIT;
      `);
    }

    const after = getCounts(db);
    console.log(
      `Done: ${after?.items ?? 0} items remaining, ${after?.sources ?? 0} sources remaining.`
    );

    if (mode === 'feed') {
      console.log(
        'Next app launch or manual refresh will re-fetch RSS items from existing sources.'
      );
    } else {
      console.log('Next app launch will re-seed default RSS sources and fetch fresh items.');
    }
    db.close();
  } catch (error) {
    throw normalizeSqliteError(error);
  }
}

run();
