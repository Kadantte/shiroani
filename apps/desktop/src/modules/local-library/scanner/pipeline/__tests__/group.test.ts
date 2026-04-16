import path from 'node:path';
import { groupEpisodes, longestCommonDirectory, pickFolderPath } from '../group';
import type { ParsedEpisodeRecord } from '../group';
import { normalizeTitleForGrouping } from '../parse-filename';

function makeRecord(
  fullPath: string,
  title: string,
  overrides: Partial<ParsedEpisodeRecord['parsed']> = {}
): ParsedEpisodeRecord {
  return {
    file: { fullPath, size: 0, mtime: '2026-04-16T00:00:00.000Z' },
    parsed: {
      title,
      titleKey: normalizeTitleForGrouping(title),
      episode: null,
      season: null,
      year: null,
      releaseGroup: null,
      resolution: null,
      kind: 'episode',
      titleFromAnitomy: true,
      ...overrides,
    },
    probe: null,
    probeError: null,
  };
}

describe('longestCommonDirectory', () => {
  it('returns null for empty input', () => {
    expect(longestCommonDirectory([])).toBeNull();
  });

  it('returns the dirname for a single path', () => {
    const file = path.join('a', 'b', 'c', 'file.mkv');
    const result = longestCommonDirectory([file]);
    expect(result).toBe(path.join('a', 'b', 'c'));
  });

  it('returns the common parent for sibling files', () => {
    const dir = path.join('root', 'show');
    const result = longestCommonDirectory([
      path.join(dir, '01.mkv'),
      path.join(dir, '02.mkv'),
      path.join(dir, '03.mkv'),
    ]);
    expect(result).toBe(dir);
  });

  it('ascends when files live in different subdirectories', () => {
    const showDir = path.join('root', 'show');
    const result = longestCommonDirectory([
      path.join(showDir, 's1', '01.mkv'),
      path.join(showDir, 's2', '02.mkv'),
    ]);
    expect(result).toBe(showDir);
  });
});

describe('pickFolderPath', () => {
  it('falls back to root when files live at root level', () => {
    const root = path.resolve('/library');
    const pick = pickFolderPath([path.join(root, 'file.mkv')], root);
    expect(pick).toBe(root);
  });

  it('picks the deepest shared directory below the root', () => {
    const root = path.resolve('/library');
    const pick = pickFolderPath(
      [path.join(root, 'Frieren', '01.mkv'), path.join(root, 'Frieren', '02.mkv')],
      root
    );
    expect(pick).toBe(path.join(root, 'Frieren'));
  });

  it('never ascends above the scan root', () => {
    const root = path.resolve('/library/sub');
    // Simulate files that share a common ancestor above the scan root — the
    // scanner shouldn't expose `/library` as the folder path for that group.
    const pick = pickFolderPath([path.join(root, 'a', 'file.mkv')], root);
    expect(pick.startsWith(root)).toBe(true);
  });
});

describe('groupEpisodes', () => {
  const root = path.resolve('/lib');

  it('collapses files sharing a normalized title into a single group', () => {
    const bocchiDir = path.join(root, 'bocchi');
    const records = [
      makeRecord(path.join(bocchiDir, '01.mkv'), 'Bocchi the Rock!'),
      makeRecord(path.join(bocchiDir, '02.mkv'), 'Bocchi the Rock'),
      makeRecord(path.join(bocchiDir, '03.mkv'), '  BOCCHI the rock!!  '),
    ];
    const groups = groupEpisodes(records, { rootPath: root });
    expect(groups).toHaveLength(1);
    expect(groups[0].episodes).toHaveLength(3);
    expect(groups[0].folderPath).toBe(bocchiDir);
  });

  it('separates groups by season', () => {
    const onkDir = path.join(root, 'onk');
    const records = [
      makeRecord(path.join(onkDir, 's1', '01.mkv'), 'Oshi no Ko', { season: 1 }),
      makeRecord(path.join(onkDir, 's1', '02.mkv'), 'Oshi no Ko', { season: 1 }),
      makeRecord(path.join(onkDir, 's2', '01.mkv'), 'Oshi no Ko', { season: 2 }),
    ];
    const groups = groupEpisodes(records, { rootPath: onkDir });
    expect(groups).toHaveLength(2);
    const s1 = groups.find(g => g.season === 1);
    const s2 = groups.find(g => g.season === 2);
    expect(s1?.episodes).toHaveLength(2);
    expect(s2?.episodes).toHaveLength(1);
  });

  it('picks the anitomy-produced title over a folder fallback', () => {
    const mythingDir = path.join(root, 'mything');
    const records = [
      // Fallback title from folder name — looks like "random hash base.mkv"
      makeRecord(path.join(mythingDir, 'abc.mkv'), 'mything', { titleFromAnitomy: false }),
      // Anitomy-derived title
      makeRecord(path.join(mythingDir, 'MyThing - 01.mkv'), 'MyThing', {
        titleFromAnitomy: true,
      }),
    ];
    // Both should share the same normalized key.
    expect(normalizeTitleForGrouping('mything')).toBe(normalizeTitleForGrouping('MyThing'));
    const groups = groupEpisodes(records, { rootPath: root });
    expect(groups).toHaveLength(1);
    expect(groups[0].parsedTitle).toBe('MyThing');
  });

  it('skips records whose parsed title is empty', () => {
    const records: ParsedEpisodeRecord[] = [
      makeRecord(path.join(root, 'x', '01.mkv'), '', { titleFromAnitomy: false }),
    ];
    const groups = groupEpisodes(records, { rootPath: root });
    expect(groups).toHaveLength(0);
  });
});
