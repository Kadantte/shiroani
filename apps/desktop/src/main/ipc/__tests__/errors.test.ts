import {
  IpcError,
  isIpcError,
  LIBRARY_ERROR_CODES,
  ANIME_ERROR_CODES,
  VALIDATION_ERROR_CODES,
} from '../errors';

describe('IpcError', () => {
  it('sets name, code, message, details', () => {
    const err = new IpcError('library.not_found', 'Not found', { id: 1 });
    expect(err.name).toBe('IpcError');
    expect(err.code).toBe('library.not_found');
    expect(err.message).toBe('Not found');
    expect(err.details).toEqual({ id: 1 });
    expect(err instanceof Error).toBe(true);
  });

  it('works without details', () => {
    const err = new IpcError('BAD_REQUEST', 'Bad request');
    expect(err.details).toBeUndefined();
  });
});

describe('isIpcError', () => {
  it('returns true for object with string code', () => {
    expect(isIpcError({ code: 'foo', message: 'bar' })).toBe(true);
  });

  it('returns false for plain Error (no code field)', () => {
    expect(isIpcError(new Error('oops'))).toBe(false);
  });

  it('returns false for null, string, number', () => {
    expect(isIpcError(null)).toBe(false);
    expect(isIpcError('error')).toBe(false);
    expect(isIpcError(42)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isIpcError(undefined)).toBe(false);
  });

  it('returns false for object with non-string code', () => {
    expect(isIpcError({ code: 123, message: 'bar' })).toBe(false);
  });

  it('returns true for IpcError instance (has code property)', () => {
    expect(isIpcError(new IpcError('test', 'test'))).toBe(true);
  });
});

describe('error code constants', () => {
  it('LIBRARY_ERROR_CODES has expected keys', () => {
    expect(LIBRARY_ERROR_CODES.ENTRY_NOT_FOUND).toBe('library.entry_not_found');
    expect(LIBRARY_ERROR_CODES.DUPLICATE_ENTRY).toBe('library.duplicate_entry');
    expect(LIBRARY_ERROR_CODES.UPDATE_FAILED).toBe('library.update_failed');
  });

  it('ANIME_ERROR_CODES has expected keys', () => {
    expect(ANIME_ERROR_CODES.NOT_FOUND).toBe('anime.not_found');
    expect(ANIME_ERROR_CODES.SEARCH_FAILED).toBe('anime.search_failed');
    expect(ANIME_ERROR_CODES.INVALID_ID).toBe('anime.invalid_id');
  });

  it('VALIDATION_ERROR_CODES has expected keys', () => {
    expect(VALIDATION_ERROR_CODES.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(VALIDATION_ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
  });
});
