import path from 'node:path';
import { parseFilename, normalizeTitleForGrouping, isAnimeVideoFile } from '../parse-filename';

describe('parseFilename', () => {
  // Representative sample of real-world anime filenames. These are the ones
  // we eyeballed against anitomy's output during the library eval so they act
  // as a golden regression set.
  const cases: {
    name: string;
    expected: {
      title?: string;
      episode?: number | null;
      season?: number | null;
      year?: number | null;
      resolution?: string | null;
      kind?: string;
    };
  }[] = [
    {
      name: '[SubsPlease] Frieren - 01 (1080p) [1F3B5A2C].mkv',
      expected: { title: 'Frieren', episode: 1, resolution: '1080p' },
    },
    {
      name: '[Erai-raws] Bocchi the Rock! - 12 [1080p][Multiple Subtitle].mkv',
      expected: { title: 'Bocchi the Rock!', episode: 12, resolution: '1080p' },
    },
    {
      name: '[LostYears] Oshi no Ko S2 - 05 (1080p AV1 10bit Opus) [ABCD1234].mkv',
      expected: { title: 'Oshi no Ko S2', episode: 5, season: 2, resolution: '1080p' },
    },
    {
      name: '[Judas] Chainsaw Man - S01E08 - Gunfire [BDRip 1080p HEVC 10-bit FLAC].mkv',
      expected: { title: 'Chainsaw Man', episode: 8, season: 1, resolution: '1080p' },
    },
    {
      name: '[SubsPlease] Spy x Family S2 - 02 (720p).mkv',
      expected: { title: 'Spy x Family S2', episode: 2, season: 2, resolution: '720p' },
    },
    {
      name: '[HorribleSubs] Nichijou - 26 (1080p).mkv',
      expected: { title: 'Nichijou', episode: 26, resolution: '1080p' },
    },
    {
      name: 'Kimi no Na wa (2016) [BDRip 1080p x264 10bit Dual Audio].mkv',
      expected: { title: 'Kimi no Na wa', year: 2016, resolution: '1080p' },
    },
    {
      name: '[Yabai] Made in Abyss - OVA 02 [1080p].mkv',
      expected: { episode: 2, resolution: '1080p', kind: 'ova' },
    },
    {
      name: 'Steins;Gate - 24 END [v2][BD 1080p x265][GER-JPN][SUB].mkv',
      expected: { title: 'Steins;Gate', episode: 24, resolution: '1080p' },
    },
    {
      name: '[Moozzi2] Violet Evergarden Movie [BD 1080p x265 10bit FLAC].mkv',
      expected: {}, // absolute-numbering movie; title/episode varies but shouldn't throw
    },
    {
      name: 'Attack on Titan - 87 [1080p].mkv',
      expected: { episode: 87, resolution: '1080p' },
    },
    {
      name: '[Commie] Mawaru Penguindrum - 03.5 [BD 1080p AAC][v2].mkv',
      expected: { title: 'Mawaru Penguindrum', episode: 3.5, resolution: '1080p' },
    },
    {
      name: '[Beatrice-Raws] Tokyo Ghoul S01E12 [BDRip 1920x1080 HEVC FLAC].mkv',
      expected: { title: 'Tokyo Ghoul', episode: 12, season: 1 },
    },
    {
      name: 'Neon Genesis Evangelion - 01.mkv',
      expected: { title: 'Neon Genesis Evangelion', episode: 1 },
    },
    {
      name: '[SubsPlease] Re Zero S3 - 05v2 (1080p).mkv',
      expected: { title: 'Re Zero S3', episode: 5, season: 3, resolution: '1080p' },
    },
  ];

  it.each(cases)('parses $name', ({ name, expected }) => {
    const fullPath = path.join('/library', 'Show', name);
    const result = parseFilename(fullPath);

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.titleKey).toEqual(expect.any(String));

    if (expected.title !== undefined) {
      expect(result.title).toBe(expected.title);
    }
    if (expected.episode !== undefined) {
      expect(result.episode).toBe(expected.episode);
    }
    if (expected.season !== undefined) {
      expect(result.season).toBe(expected.season);
    }
    if (expected.year !== undefined) {
      expect(result.year).toBe(expected.year);
    }
    if (expected.resolution !== undefined) {
      expect(result.resolution).toBe(expected.resolution);
    }
    if (expected.kind !== undefined) {
      expect(result.kind).toBe(expected.kind);
    }
  });

  it('falls back to parent folder when anitomy yields empty title', () => {
    // A filename that's basically a hash — anitomy typically returns nothing.
    const fullPath = path.join('/library', 'My Favourite Show', 'abc123.mkv');
    const result = parseFilename(fullPath);
    // Either anitomy returned a title (fine) or we fell back to the folder.
    expect(result.title.length).toBeGreaterThan(0);
    if (!result.titleFromAnitomy) {
      expect(result.title).toBe('My Favourite Show');
    }
  });

  it('normalizes titles for grouping — punctuation and casing collapse', () => {
    expect(normalizeTitleForGrouping('Bocchi the Rock!')).toBe('bocchi the rock');
    expect(normalizeTitleForGrouping('Re:Zero - Starting Life')).toBe('re zero starting life');
    expect(normalizeTitleForGrouping('  SPY x FAMILY  ')).toBe('spy x family');
  });

  it('isAnimeVideoFile matches the canonical extension list', () => {
    expect(isAnimeVideoFile('/path/foo.mkv')).toBe(true);
    expect(isAnimeVideoFile('/path/foo.MKV')).toBe(true);
    expect(isAnimeVideoFile('/path/foo.webm')).toBe(true);
    expect(isAnimeVideoFile('/path/foo.srt')).toBe(false);
    expect(isAnimeVideoFile('/path/foo')).toBe(false);
  });
});
