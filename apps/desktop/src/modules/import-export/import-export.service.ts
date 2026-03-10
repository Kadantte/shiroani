import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type AnimeEntry,
  type DiaryEntry,
  type ShiroaniExportFormat,
  type ImportItemResult,
} from '@shiroani/shared';
import { LibraryService } from '../library';
import { DiaryService } from '../diary';

const logger = createLogger('ImportExportService');

@Injectable()
export class ImportExportService {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly diaryService: DiaryService
  ) {
    logger.info('ImportExportService initialized');
  }

  /** Export library and/or diary entries into the ShiroaniExportFormat. */
  exportData(type: 'library' | 'diary' | 'all', ids?: number[]): ShiroaniExportFormat {
    const result: ShiroaniExportFormat = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'shiroani',
      data: {},
    };

    if (type === 'library' || type === 'all') {
      let entries = this.libraryService.getAllEntries();
      if (ids && type === 'library') {
        entries = entries.filter(e => ids.includes(e.id));
      }
      result.data.library = entries.map(({ id: _id, ...rest }) => rest);
    }

    if (type === 'diary' || type === 'all') {
      let entries = this.diaryService.getAllEntries();
      if (ids && type === 'diary') {
        entries = entries.filter(e => ids.includes(e.id));
      }
      result.data.diary = entries.map(({ id: _id, animeId: _animeId, ...rest }) => rest);
    }

    const libraryCount = result.data.library?.length ?? 0;
    const diaryCount = result.data.diary?.length ?? 0;
    logger.info(`Exported ${libraryCount} library + ${diaryCount} diary entries`);

    return result;
  }

  /** Import a single library entry with duplicate detection. */
  importLibraryEntry(
    entry: Omit<AnimeEntry, 'id'>,
    strategy: 'skip' | 'overwrite'
  ): ImportItemResult {
    const baseResult: ImportItemResult = {
      index: 0,
      title: entry.title,
      status: 'processing',
    };

    try {
      const allEntries = this.libraryService.getAllEntries();
      const duplicate = allEntries.find(
        existing =>
          (entry.anilistId !== undefined && existing.anilistId === entry.anilistId) ||
          existing.title === entry.title ||
          (entry.resumeUrl !== undefined &&
            entry.resumeUrl !== '' &&
            existing.resumeUrl === entry.resumeUrl)
      );

      if (duplicate) {
        if (strategy === 'skip') {
          return { ...baseResult, status: 'skipped' };
        }

        // Overwrite: update the existing entry
        this.libraryService.updateEntry(duplicate.id, {
          anilistId: entry.anilistId ?? null,
          status: entry.status,
          currentEpisode: entry.currentEpisode,
          score: entry.score,
          notes: entry.notes,
          resumeUrl: entry.resumeUrl,
        });
        return { ...baseResult, status: 'success' };
      }

      // No duplicate — add new entry
      this.libraryService.addEntry({
        anilistId: entry.anilistId,
        title: entry.title,
        titleRomaji: entry.titleRomaji,
        titleNative: entry.titleNative,
        coverImage: entry.coverImage,
        episodes: entry.episodes,
        status: entry.status,
        currentEpisode: entry.currentEpisode,
        resumeUrl: entry.resumeUrl,
      });
      return { ...baseResult, status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error importing library entry "${entry.title}":`, error);
      return { ...baseResult, status: 'error', error: message };
    }
  }

  /** Import a single diary entry with duplicate detection. */
  importDiaryEntry(
    entry: Omit<DiaryEntry, 'id' | 'animeId'>,
    strategy: 'skip' | 'overwrite'
  ): ImportItemResult {
    const baseResult: ImportItemResult = {
      index: 0,
      title: entry.title,
      status: 'processing',
    };

    try {
      const allEntries = this.diaryService.getAllEntries();
      const duplicate = allEntries.find(
        existing => existing.title === entry.title && existing.createdAt === entry.createdAt
      );

      if (duplicate) {
        if (strategy === 'skip') {
          return { ...baseResult, status: 'skipped' };
        }

        // Overwrite: update the existing entry
        this.diaryService.updateEntry(duplicate.id, {
          title: entry.title,
          contentJson: entry.contentJson,
          coverGradient: entry.coverGradient ?? null,
          mood: entry.mood ?? null,
          tags: entry.tags ?? null,
          animeTitle: entry.animeTitle ?? null,
          animeCoverImage: entry.animeCoverImage ?? null,
          isPinned: entry.isPinned,
        });
        return { ...baseResult, status: 'success' };
      }

      // No duplicate — create new entry
      this.diaryService.createEntry({
        title: entry.title,
        contentJson: entry.contentJson,
        coverGradient: entry.coverGradient,
        mood: entry.mood,
        tags: entry.tags,
        animeTitle: entry.animeTitle,
        animeCoverImage: entry.animeCoverImage,
      });
      return { ...baseResult, status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error importing diary entry "${entry.title}":`, error);
      return { ...baseResult, status: 'error', error: message };
    }
  }
}
