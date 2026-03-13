import { parseDuration, formatDuration } from './duration';

describe('parseDuration', () => {
  it('should parse seconds', () => {
    expect(parseDuration('30s')).toBe(30);
  });

  it('should parse minutes', () => {
    expect(parseDuration('10m')).toBe(600);
  });

  it('should parse hours', () => {
    expect(parseDuration('2h')).toBe(7200);
  });

  it('should parse days', () => {
    expect(parseDuration('7d')).toBe(604800);
  });

  it('should be case-insensitive', () => {
    expect(parseDuration('10M')).toBe(600);
    expect(parseDuration('2H')).toBe(7200);
    expect(parseDuration('7D')).toBe(604800);
  });

  it('should return null for invalid format', () => {
    expect(parseDuration('invalid')).toBeNull();
    expect(parseDuration('10')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('10x')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(30)).toBe('30s');
  });

  it('should format minutes', () => {
    expect(formatDuration(600)).toBe('10m');
  });

  it('should format hours', () => {
    expect(formatDuration(7200)).toBe('2h');
  });

  it('should format days', () => {
    expect(formatDuration(86400)).toBe('1d');
    expect(formatDuration(604800)).toBe('7d');
  });

  it('should floor partial units', () => {
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(5400)).toBe('1h');
    expect(formatDuration(90000)).toBe('1d');
  });
});
