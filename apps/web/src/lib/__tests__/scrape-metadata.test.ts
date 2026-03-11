import { describe, it, expect } from 'vitest';
import { SCRAPE_METADATA_SCRIPT } from '../scrape-metadata';

describe('SCRAPE_METADATA_SCRIPT', () => {
  it('is a non-empty string containing an IIFE', () => {
    expect(typeof SCRAPE_METADATA_SCRIPT).toBe('string');
    expect(SCRAPE_METADATA_SCRIPT.length).toBeGreaterThan(0);
    expect(SCRAPE_METADATA_SCRIPT).toContain('(function()');
  });

  it('returns a result object with coverImage, title, and episodes fields', () => {
    expect(SCRAPE_METADATA_SCRIPT).toContain('result.coverImage');
    expect(SCRAPE_METADATA_SCRIPT).toContain('result.title');
    expect(SCRAPE_METADATA_SCRIPT).toContain('result.episodes');
  });

  it('includes site-specific scrapers for all supported sites', () => {
    expect(SCRAPE_METADATA_SCRIPT).toContain("host === 'ogladajanime.pl'");
    expect(SCRAPE_METADATA_SCRIPT).toContain("host === 'anilist.co'");
    expect(SCRAPE_METADATA_SCRIPT).toContain("host === 'myanimelist.net'");
    expect(SCRAPE_METADATA_SCRIPT).toContain("host === 'shinden.pl'");
  });

  it('includes og:image fallback', () => {
    expect(SCRAPE_METADATA_SCRIPT).toContain('og:image');
  });

  it('includes twitter:image fallback', () => {
    expect(SCRAPE_METADATA_SCRIPT).toContain('twitter:image');
  });

  it('includes og:title fallback', () => {
    expect(SCRAPE_METADATA_SCRIPT).toContain('og:title');
  });

  it('is valid JavaScript (can be parsed without errors)', () => {
    expect(() => new Function(SCRAPE_METADATA_SCRIPT)).not.toThrow();
  });
});
