/**
 * Import/Export Types - Types for data import/export functionality
 */

import type { AnimeEntry } from './anime';
import type { DiaryEntry } from './diary';

export interface ShiroaniExportFormat {
  version: 1;
  exportedAt: string;
  source: 'shiroani';
  data: {
    library?: Omit<AnimeEntry, 'id'>[];
    diary?: Omit<DiaryEntry, 'id' | 'animeId'>[];
  };
}

export interface ImportItemResult {
  index: number;
  title: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
  error?: string;
}

export interface ExportRequest {
  type: 'library' | 'diary' | 'all';
  ids?: number[];
}

export interface ImportRequest {
  type: 'library' | 'diary' | 'all';
  data: ShiroaniExportFormat;
  strategy: 'skip' | 'overwrite';
}

export interface ImportResponse {
  results: ImportItemResult[];
  totalImported: number;
  totalSkipped: number;
  totalErrors: number;
}

export interface ExportResponse {
  data: ShiroaniExportFormat;
  totalExported: number;
}
