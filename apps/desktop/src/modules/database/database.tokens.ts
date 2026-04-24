/**
 * DI token for the path to the SQLite database file. Injected by the Electron
 * host at bootstrap so `DatabaseService` does not need to import `electron`
 * directly, keeping the NestJS module reusable and unit-testable.
 */
export const DATABASE_PATH = 'DATABASE_PATH';
