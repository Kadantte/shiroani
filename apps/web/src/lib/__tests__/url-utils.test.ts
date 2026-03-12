import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '../url-utils';

describe('normalizeUrl', () => {
  // ── URLs with protocol ──────────────────────────────────────────

  it('returns URL as-is when it has https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('returns URL as-is when it has http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('treats non-http(s) protocols as search queries (ftp://)', () => {
    expect(normalizeUrl('ftp://files.example.com')).toBe(
      'https://www.google.com/search?q=ftp%3A%2F%2Ffiles.example.com'
    );
  });

  it('treats non-http(s) protocols as search queries (chrome://)', () => {
    expect(normalizeUrl('chrome://settings')).toBe(
      'https://www.google.com/search?q=chrome%3A%2F%2Fsettings'
    );
  });

  // ── Domain-like inputs ──────────────────────────────────────────

  it('prepends https:// to a bare domain', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('prepends https:// to a subdomain', () => {
    expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
  });

  it('prepends https:// to a domain with path', () => {
    expect(normalizeUrl('example.com/path')).toBe('https://example.com/path');
  });

  it('prepends https:// to domain with port when it contains a dot', () => {
    expect(normalizeUrl('example.com:8080')).toBe('https://example.com:8080');
  });

  it('treats localhost:port as a search query (no dot)', () => {
    expect(normalizeUrl('localhost:3000')).toBe('https://www.google.com/search?q=localhost%3A3000');
  });

  // ── Search queries ──────────────────────────────────────────────

  it('treats input without dots as a search query', () => {
    expect(normalizeUrl('anime list')).toBe('https://www.google.com/search?q=anime%20list');
  });

  it('treats single word without dot as a search query', () => {
    expect(normalizeUrl('naruto')).toBe('https://www.google.com/search?q=naruto');
  });

  it('treats input with spaces and dots as a search query', () => {
    // Has a dot but also has spaces → search query
    expect(normalizeUrl('example .com')).toBe('https://www.google.com/search?q=example%20.com');
  });

  it('encodes special characters in search queries', () => {
    expect(normalizeUrl('test & value')).toBe('https://www.google.com/search?q=test%20%26%20value');
  });

  // ── Whitespace handling ─────────────────────────────────────────

  it('trims leading and trailing whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('trims whitespace before domain detection', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });

  // ── Edge cases ──────────────────────────────────────────────────

  it('handles empty string as a search query', () => {
    expect(normalizeUrl('')).toBe('https://www.google.com/search?q=');
  });

  it('handles localhost without port as a search query (no dot)', () => {
    expect(normalizeUrl('localhost')).toBe('https://www.google.com/search?q=localhost');
  });
});
