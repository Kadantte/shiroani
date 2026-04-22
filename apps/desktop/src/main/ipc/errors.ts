export class IpcError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'IpcError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Structural check — Electron strips prototype across IPC; instanceof won't work renderer-side.
 */
export function isIpcError(e: unknown): e is { code: string; message: string; details?: unknown } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as Record<string, unknown>).code === 'string'
  );
}

export const LIBRARY_ERROR_CODES = {
  ENTRY_NOT_FOUND: 'library.entry_not_found',
  DUPLICATE_ENTRY: 'library.duplicate_entry',
  UPDATE_FAILED: 'library.update_failed',
} as const;

export const ANIME_ERROR_CODES = {
  NOT_FOUND: 'anime.not_found',
  SEARCH_FAILED: 'anime.search_failed',
  INVALID_ID: 'anime.invalid_id',
} as const;

export const VALIDATION_ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
} as const;
