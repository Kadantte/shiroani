import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import type { PlayerSessionMode } from '@/components/local-library/player/player.types';
import {
  LocalLibraryEvents,
  createLogger,
  type ContinueWatchingItem,
  type LibraryRoot,
  type LocalEpisode,
  type LocalSeries,
  type PlaybackProgress,
  type SeriesProgressSummary,
  type LocalLibraryRootsResult,
  type LocalLibrarySeriesResult,
  type LocalLibraryEpisodesResult,
  type LocalLibraryContinueWatchingResult,
  type LocalLibrarySeriesProgressResult,
  type LocalLibraryMarkEpisodeWatchedResult,
  type LocalLibraryMarkSeriesWatchedResult,
  type LocalLibraryRootAddedResult,
  type LocalLibraryRootRemovedResult,
  type LocalLibraryScanPhase,
  type LocalLibraryScanStartedPayload,
  type LocalLibraryScanProgressPayload,
  type LocalLibraryScanDonePayload,
  type LocalLibraryScanFailedPayload,
  type LocalLibraryScanCancelledPayload,
  type LocalLibrarySeriesUpdatedPayload,
  type LocalLibrarySeriesRemovedPayload,
  type LocalLibraryEpisodeProgressUpdatedPayload,
  type LocalLibraryStartScanResult,
  type LocalLibraryCancelScanResult,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { IS_ELECTRON } from '@/lib/platform';

const logger = createLogger('LocalLibraryStore');

/** Per-root scan progress snapshot. Absent when no scan is in flight. */
export interface ScanProgressSnapshot {
  scanId: number;
  phase: LocalLibraryScanPhase;
  filesSeen: number;
  filesDone: number;
  filesTotal: number;
  filesSkipped: number;
  currentPath: string | null;
  seriesCount: number;
  /** Last error from a SCAN_FAILED. Cleared when a new scan starts. */
  error: string | null;
  errorCode: string | null;
}

export type LibrarySortMode = 'recent' | 'alphabetical' | 'recently-watched';
export type LibraryMatchFilter = 'all' | 'unmatched' | 'matched';

export interface LibraryFilters {
  search: string;
  /** Empty array == "all roots". */
  rootIds: number[];
  matchStatus: LibraryMatchFilter;
  sort: LibrarySortMode;
}

const DEFAULT_FILTERS: LibraryFilters = {
  search: '',
  rootIds: [],
  matchStatus: 'all',
  sort: 'recent',
};

interface LocalLibraryState extends SocketStoreSlice {
  roots: LibraryRoot[];
  series: LocalSeries[];
  /** Cached continue-watching rail (hydrated on connect + after scans). */
  continueWatching: ContinueWatchingItem[];
  /** Episode lists keyed by seriesId. Lazily hydrated when a detail view opens. */
  episodes: Record<number, LocalEpisode[]>;
  /** Progress summaries keyed by seriesId. */
  seriesProgress: Record<number, SeriesProgressSummary>;
  /** Individual episode progress, keyed by episodeId. */
  episodeProgress: Record<number, PlaybackProgress>;
  /** Path currently being submitted (add-root in flight) — disables UI. */
  isAddingRoot: boolean;
  /** Active scan state keyed by rootId. */
  scanProgress: Record<number, ScanProgressSnapshot>;
  /** Sub-navigation: non-null when a series detail view is open. */
  activeSeriesId: number | null;
  /** Sub-navigation: non-null when the player is open. */
  playingEpisodeId: number | null;
  /**
   * Current ffmpeg delivery mode when a player session is live. Non-null only
   * while the player is mounted and has a session — the grid/header reads this
   * to show a lightweight "Playing: … (transcoding)" hint.
   */
  playerMode: PlayerSessionMode | null;
  /** Grid filters (client-side only — no server round-trip). */
  filters: LibraryFilters;
}

interface LocalLibraryActions {
  refreshRoots: () => void;
  refreshSeries: (rootId?: number) => void;
  addRoot: (path: string, label?: string) => Promise<LibraryRoot | null>;
  removeRoot: (id: number) => Promise<void>;
  /** Open the native folder picker then add the chosen folder as a root. */
  pickAndAddRoot: () => Promise<LibraryRoot | null>;
  /** Kick off a scan for the given root. No-op if already scanning. */
  startScan: (rootId: number) => Promise<void>;
  /** Kick off a scan for every registered root (sequentially — each scan
   *  already spawns a worker, so concurrency is an implementation concern
   *  the server handles). */
  rescanAll: () => Promise<void>;
  /** Request cancellation of an in-flight scan. */
  cancelScan: (rootId: number) => Promise<void>;
  /** Hydrate the "Continue watching" rail. */
  refreshContinueWatching: (limit?: number) => Promise<void>;
  /** Load episodes for a series into `episodes[seriesId]`. */
  refreshEpisodes: (seriesId: number) => Promise<void>;
  /** Load the progress summary for a series. */
  refreshSeriesProgress: (seriesId: number) => Promise<void>;
  /** Mark a single episode watched / unwatched. */
  markEpisodeWatched: (episodeId: number, watched: boolean) => Promise<void>;
  /** Mark every episode of a series watched / unwatched. */
  markSeriesWatched: (seriesId: number, watched: boolean) => Promise<void>;
  /** Sub-navigation helpers. */
  openSeries: (id: number) => void;
  backToGrid: () => void;
  openPlayer: (episodeId: number) => void;
  closePlayer: () => void;
  /** Set by the player once a session is open so the shell can show a badge. */
  setPlayerMode: (mode: PlayerSessionMode | null) => void;
  /** Partial update for the filter panel. */
  updateFilters: (patch: Partial<LibraryFilters>) => void;
  resetFilters: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type LocalLibraryStore = LocalLibraryState & LocalLibraryActions;

/** Merge incoming series into the cached list, de-duping by id. */
function mergeSeries(existing: LocalSeries[], incoming: LocalSeries[]): LocalSeries[] {
  if (incoming.length === 0) return existing;
  const byId = new Map(existing.map(s => [s.id, s]));
  for (const s of incoming) {
    byId.set(s.id, s);
  }
  return Array.from(byId.values());
}

function applyEpisodeProgress(
  episodes: LocalEpisode[] | undefined,
  _episodeId: number
): LocalEpisode[] | undefined {
  // Kept as a seam for future logic that mutates episode ordering on progress
  // (e.g. bubble most-recently-played). Currently a no-op so the cached list
  // stays stable.
  return episodes;
}

export const useLocalLibraryStore = create<LocalLibraryStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<LocalLibraryStore>(set, 'localLibrary');

      const { initListeners, cleanupListeners } = createSocketListeners<LocalLibraryStore>(
        get,
        set,
        'localLibrary',
        {
          listeners: [
            {
              event: LocalLibraryEvents.ROOT_ADDED,
              handler: data => {
                const { root } = (data as LocalLibraryRootAddedResult) ?? {};
                if (!root) return;
                set(
                  state => {
                    if (state.roots.some(r => r.id === root.id)) return state;
                    return { roots: [...state.roots, root] };
                  },
                  undefined,
                  'localLibrary/rootAdded'
                );
              },
            },
            {
              event: LocalLibraryEvents.ROOT_REMOVED,
              handler: data => {
                const { id } = (data as LocalLibraryRootRemovedResult) ?? { id: -1 };
                if (typeof id !== 'number' || id < 0) return;
                set(
                  state => {
                    const { [id]: _removed, ...remainingScans } = state.scanProgress;
                    void _removed;
                    // Purge filter-selected root if it's gone.
                    const rootIds = state.filters.rootIds.filter(r => r !== id);
                    return {
                      roots: state.roots.filter(r => r.id !== id),
                      series: state.series.filter(s => s.rootId !== id),
                      scanProgress: remainingScans,
                      filters: { ...state.filters, rootIds },
                    };
                  },
                  undefined,
                  'localLibrary/rootRemoved'
                );
              },
            },
            {
              event: LocalLibraryEvents.SCAN_STARTED,
              handler: data => {
                const payload = data as LocalLibraryScanStartedPayload | undefined;
                if (!payload || typeof payload.rootId !== 'number') return;
                set(
                  state => ({
                    scanProgress: {
                      ...state.scanProgress,
                      [payload.rootId]: {
                        scanId: payload.scanId,
                        phase: 'starting',
                        filesSeen: 0,
                        filesDone: 0,
                        filesTotal: 0,
                        filesSkipped: 0,
                        currentPath: null,
                        seriesCount: 0,
                        error: null,
                        errorCode: null,
                      },
                    },
                  }),
                  undefined,
                  'localLibrary/scanStarted'
                );
              },
            },
            {
              event: LocalLibraryEvents.SCAN_PROGRESS,
              handler: data => {
                const payload = data as LocalLibraryScanProgressPayload | undefined;
                if (!payload) return;
                set(
                  state => {
                    const prev = state.scanProgress[payload.rootId];
                    return {
                      scanProgress: {
                        ...state.scanProgress,
                        [payload.rootId]: {
                          scanId: payload.scanId,
                          phase: payload.phase,
                          filesSeen: payload.filesSeen,
                          filesDone: payload.filesDone,
                          filesTotal: payload.filesTotal,
                          filesSkipped: payload.filesSkipped,
                          currentPath: payload.currentPath,
                          seriesCount: payload.seriesCount,
                          error: prev?.error ?? null,
                          errorCode: prev?.errorCode ?? null,
                        },
                      },
                    };
                  },
                  undefined,
                  'localLibrary/scanProgress'
                );
              },
            },
            {
              event: LocalLibraryEvents.SERIES_UPDATED,
              handler: data => {
                const payload = data as LocalLibrarySeriesUpdatedPayload | undefined;
                if (!payload || !Array.isArray(payload.series)) return;
                set(
                  state => ({
                    series: mergeSeries(state.series, payload.series),
                  }),
                  undefined,
                  'localLibrary/seriesUpdated'
                );
              },
            },
            {
              event: LocalLibraryEvents.SERIES_REMOVED,
              handler: data => {
                const payload = data as LocalLibrarySeriesRemovedPayload | undefined;
                if (!payload || !Array.isArray(payload.seriesIds)) return;
                const removedSet = new Set(payload.seriesIds);
                if (removedSet.size === 0) return;
                set(
                  state => {
                    // Drop removed series from the grid + any cached detail data.
                    const nextEpisodes: Record<number, LocalEpisode[]> = {};
                    for (const [key, value] of Object.entries(state.episodes)) {
                      const id = Number(key);
                      if (!removedSet.has(id)) nextEpisodes[id] = value;
                    }
                    const nextSeriesProgress: Record<number, SeriesProgressSummary> = {};
                    for (const [key, value] of Object.entries(state.seriesProgress)) {
                      const id = Number(key);
                      if (!removedSet.has(id)) nextSeriesProgress[id] = value;
                    }
                    // If the user was looking at a now-deleted series, bounce
                    // them back to the grid rather than dangling.
                    const activeSeriesId =
                      state.activeSeriesId && removedSet.has(state.activeSeriesId)
                        ? null
                        : state.activeSeriesId;
                    return {
                      series: state.series.filter(s => !removedSet.has(s.id)),
                      episodes: nextEpisodes,
                      seriesProgress: nextSeriesProgress,
                      continueWatching: state.continueWatching.filter(
                        item => !removedSet.has(item.series.id)
                      ),
                      activeSeriesId,
                    };
                  },
                  undefined,
                  'localLibrary/seriesRemoved'
                );
              },
            },
            {
              event: LocalLibraryEvents.EPISODE_PROGRESS_UPDATED,
              handler: data => {
                const payload = data as LocalLibraryEpisodeProgressUpdatedPayload | undefined;
                if (!payload?.progress) return;
                set(
                  state => ({
                    episodeProgress: {
                      ...state.episodeProgress,
                      [payload.episodeId]: payload.progress,
                    },
                    episodes: {
                      ...state.episodes,
                      [payload.seriesId]: applyEpisodeProgress(
                        state.episodes[payload.seriesId],
                        payload.episodeId
                      ) as LocalEpisode[],
                    },
                  }),
                  undefined,
                  'localLibrary/episodeProgressUpdated'
                );
              },
            },
            {
              event: LocalLibraryEvents.SCAN_DONE,
              handler: (data, get) => {
                const payload = data as LocalLibraryScanDonePayload | undefined;
                if (!payload) return;
                set(
                  state => {
                    const { [payload.rootId]: _done, ...rest } = state.scanProgress;
                    void _done;
                    return { scanProgress: rest };
                  },
                  undefined,
                  'localLibrary/scanDone'
                );
                // Refresh authoritative series list + roots (last_scanned_at updated).
                get().refreshSeries();
                get().refreshRoots();
                void get().refreshContinueWatching();
              },
            },
            {
              event: LocalLibraryEvents.SCAN_FAILED,
              handler: data => {
                const payload = data as LocalLibraryScanFailedPayload | undefined;
                if (!payload) return;
                set(
                  state => {
                    const prev = state.scanProgress[payload.rootId];
                    // Keep the row around so UI can display the error, but mark phase done.
                    return {
                      scanProgress: {
                        ...state.scanProgress,
                        [payload.rootId]: {
                          ...(prev ?? {
                            scanId: payload.scanId ?? -1,
                            phase: 'done' as LocalLibraryScanPhase,
                            filesSeen: 0,
                            filesDone: 0,
                            filesTotal: 0,
                            filesSkipped: 0,
                            currentPath: null,
                            seriesCount: 0,
                          }),
                          phase: 'done',
                          error: payload.error,
                          errorCode: payload.code ?? null,
                        },
                      },
                    };
                  },
                  undefined,
                  'localLibrary/scanFailed'
                );
              },
            },
            {
              event: LocalLibraryEvents.SCAN_CANCELLED,
              handler: data => {
                const payload = data as LocalLibraryScanCancelledPayload | undefined;
                if (!payload) return;
                set(
                  state => {
                    const { [payload.rootId]: _cancelled, ...rest } = state.scanProgress;
                    void _cancelled;
                    return { scanProgress: rest };
                  },
                  undefined,
                  'localLibrary/scanCancelled'
                );
              },
            },
          ],
          onConnect: () => {
            get().refreshRoots();
            get().refreshSeries();
            void get().refreshContinueWatching();
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        roots: [],
        series: [],
        continueWatching: [],
        episodes: {},
        seriesProgress: {},
        episodeProgress: {},
        isAddingRoot: false,
        scanProgress: {},
        activeSeriesId: null,
        playingEpisodeId: null,
        playerMode: null,
        filters: { ...DEFAULT_FILTERS },

        // Socket actions
        ...socketActions,

        // Actions
        refreshRoots: () => {
          set({ isLoading: true }, undefined, 'localLibrary/refreshRoots');
          emitWithErrorHandling<Record<string, never>, LocalLibraryRootsResult>(
            LocalLibraryEvents.LIST_ROOTS,
            {}
          )
            .then(data => {
              set(
                { roots: data.roots ?? [], isLoading: false, error: null },
                undefined,
                'localLibrary/rootsResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch roots:', err.message);
              set(
                { isLoading: false, error: err.message },
                undefined,
                'localLibrary/refreshRootsError'
              );
            });
        },

        refreshSeries: (rootId?: number) => {
          emitWithErrorHandling<{ rootId?: number }, LocalLibrarySeriesResult>(
            LocalLibraryEvents.LIST_SERIES,
            { rootId }
          )
            .then(data => {
              set(
                { series: data.series ?? [], error: null },
                undefined,
                'localLibrary/seriesResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch series:', err.message);
              set({ error: err.message }, undefined, 'localLibrary/refreshSeriesError');
            });
        },

        refreshContinueWatching: async (limit = 20) => {
          try {
            const data = await emitWithErrorHandling<
              { limit: number },
              LocalLibraryContinueWatchingResult
            >(LocalLibraryEvents.LIST_CONTINUE_WATCHING, { limit });
            set(
              { continueWatching: data.items ?? [] },
              undefined,
              'localLibrary/continueWatchingResult'
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to fetch continue watching:', message);
          }
        },

        refreshEpisodes: async (seriesId: number) => {
          try {
            const data = await emitWithErrorHandling<
              { seriesId: number },
              LocalLibraryEpisodesResult
            >(LocalLibraryEvents.LIST_EPISODES, { seriesId });
            set(
              state => ({
                episodes: { ...state.episodes, [seriesId]: data.episodes ?? [] },
              }),
              undefined,
              'localLibrary/episodesResult'
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to fetch episodes for series ${seriesId}:`, message);
          }
        },

        refreshSeriesProgress: async (seriesId: number) => {
          try {
            const data = await emitWithErrorHandling<
              { seriesId: number },
              LocalLibrarySeriesProgressResult
            >(LocalLibraryEvents.GET_SERIES_PROGRESS, { seriesId });
            if (!data.summary) return;
            set(
              state => ({
                seriesProgress: { ...state.seriesProgress, [seriesId]: data.summary },
              }),
              undefined,
              'localLibrary/seriesProgressResult'
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to fetch progress for series ${seriesId}:`, message);
          }
        },

        markEpisodeWatched: async (episodeId: number, watched: boolean) => {
          try {
            const result = await emitWithErrorHandling<
              { episodeId: number; watched: boolean },
              LocalLibraryMarkEpisodeWatchedResult
            >(LocalLibraryEvents.MARK_EPISODE_WATCHED, { episodeId, watched });

            set(
              state => {
                const nextEpisodeProgress = { ...state.episodeProgress };
                if (result.progress) {
                  nextEpisodeProgress[episodeId] = result.progress;
                } else {
                  delete nextEpisodeProgress[episodeId];
                }
                return { episodeProgress: nextEpisodeProgress };
              },
              undefined,
              'localLibrary/markEpisodeWatched'
            );

            if (result.seriesId > 0) {
              void get().refreshSeriesProgress(result.seriesId);
            }
            void get().refreshContinueWatching();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to mark episode ${episodeId}:`, message);
          }
        },

        markSeriesWatched: async (seriesId: number, watched: boolean) => {
          try {
            await emitWithErrorHandling<
              { seriesId: number; watched: boolean },
              LocalLibraryMarkSeriesWatchedResult
            >(LocalLibraryEvents.MARK_SERIES_WATCHED, { seriesId, watched });
            // Refresh explicitly — the per-episode EPISODE_PROGRESS_UPDATED
            // events will also update the cache, but hit the aggregate now
            // so the detail header flips immediately.
            void get().refreshSeriesProgress(seriesId);
            void get().refreshEpisodes(seriesId);
            void get().refreshContinueWatching();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to mark series ${seriesId}:`, message);
          }
        },

        addRoot: async (path: string, label?: string) => {
          set({ isAddingRoot: true, error: null }, undefined, 'localLibrary/addRoot');
          try {
            const result = await emitWithErrorHandling<
              { path: string; label?: string },
              { root: LibraryRoot | null }
            >(LocalLibraryEvents.ADD_ROOT, { path, label });
            const root = result?.root ?? null;
            if (root) {
              set(
                state => {
                  if (state.roots.some(r => r.id === root.id)) return { isAddingRoot: false };
                  return { roots: [...state.roots, root], isAddingRoot: false };
                },
                undefined,
                'localLibrary/addRootSuccess'
              );
            } else {
              set({ isAddingRoot: false }, undefined, 'localLibrary/addRootDone');
            }
            return root;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to add root:', message);
            set({ isAddingRoot: false, error: message }, undefined, 'localLibrary/addRootError');
            return null;
          }
        },

        removeRoot: async (id: number) => {
          const previousRoots = get().roots;
          // Optimistic removal
          set(
            state => ({ roots: state.roots.filter(r => r.id !== id) }),
            undefined,
            'localLibrary/optimisticRemoveRoot'
          );
          try {
            await emitWithErrorHandling<{ id: number }, LocalLibraryRootRemovedResult>(
              LocalLibraryEvents.REMOVE_ROOT,
              { id }
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to remove root:', message);
            // Restore on error
            set(
              { roots: previousRoots, error: message },
              undefined,
              'localLibrary/removeRootError'
            );
          }
        },

        pickAndAddRoot: async () => {
          if (!IS_ELECTRON || !window.shiroaniLocalLibrary) {
            logger.warn('pickAndAddRoot called outside Electron — no bridge available');
            return null;
          }
          const result = await window.shiroaniLocalLibrary.pickFolder();
          if (result.cancelled || !result.path) {
            return null;
          }
          const root = await get().addRoot(result.path);
          if (root) {
            // Auto-kick the initial scan so the user flow is single-click.
            void get().startScan(root.id);
          }
          return root;
        },

        startScan: async (rootId: number) => {
          if (get().scanProgress[rootId]) {
            logger.info(`Scan already in progress for root ${rootId}`);
            return;
          }
          try {
            const result = await emitWithErrorHandling<
              { rootId: number },
              LocalLibraryStartScanResult
            >(LocalLibraryEvents.START_SCAN, { rootId });
            if (!result?.scanId) {
              const message = result?.error ?? 'Failed to start scan';
              logger.error(`startScan failed: ${message}`);
              set(
                state => ({
                  scanProgress: {
                    ...state.scanProgress,
                    [rootId]: {
                      scanId: -1,
                      phase: 'done',
                      filesSeen: 0,
                      filesDone: 0,
                      filesTotal: 0,
                      filesSkipped: 0,
                      currentPath: null,
                      seriesCount: 0,
                      error: message,
                      errorCode: result?.code ?? null,
                    },
                  },
                }),
                undefined,
                'localLibrary/startScanError'
              );
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`startScan threw: ${message}`);
            set({ error: message }, undefined, 'localLibrary/startScanThrew');
          }
        },

        rescanAll: async () => {
          const { roots } = get();
          for (const root of roots) {
            await get().startScan(root.id);
          }
        },

        cancelScan: async (rootId: number) => {
          try {
            await emitWithErrorHandling<{ rootId: number }, LocalLibraryCancelScanResult>(
              LocalLibraryEvents.CANCEL_SCAN,
              { rootId }
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`cancelScan failed: ${message}`);
          }
        },

        openSeries: (id: number) => {
          set({ activeSeriesId: id, playingEpisodeId: null }, undefined, 'localLibrary/openSeries');
          // Hydrate in the background — the detail view also calls these but
          // priming here keeps the UI snappy.
          void get().refreshEpisodes(id);
          void get().refreshSeriesProgress(id);
        },

        backToGrid: () => {
          set(
            { activeSeriesId: null, playingEpisodeId: null, playerMode: null },
            undefined,
            'localLibrary/backToGrid'
          );
        },

        openPlayer: (episodeId: number) => {
          set(
            { playingEpisodeId: episodeId, playerMode: null },
            undefined,
            'localLibrary/openPlayer'
          );
        },

        closePlayer: () => {
          set({ playingEpisodeId: null, playerMode: null }, undefined, 'localLibrary/closePlayer');
        },

        setPlayerMode: (mode: PlayerSessionMode | null) => {
          set({ playerMode: mode }, undefined, 'localLibrary/setPlayerMode');
        },

        updateFilters: patch => {
          set(
            state => ({ filters: { ...state.filters, ...patch } }),
            undefined,
            'localLibrary/updateFilters'
          );
        },

        resetFilters: () => {
          set({ filters: { ...DEFAULT_FILTERS } }, undefined, 'localLibrary/resetFilters');
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'localLibrary' }
  )
);

/** Pure selector so the filtered list can be memoised + unit-tested in isolation. */
export function getFilteredSeries(state: {
  series: LocalSeries[];
  filters: LibraryFilters;
  seriesProgress: Record<number, SeriesProgressSummary>;
}): LocalSeries[] {
  const { series, filters, seriesProgress } = state;

  const search = filters.search.trim().toLowerCase();
  const rootSet = filters.rootIds.length > 0 ? new Set(filters.rootIds) : null;

  const filtered = series.filter(s => {
    if (rootSet && !rootSet.has(s.rootId)) return false;
    if (filters.matchStatus === 'unmatched' && s.matchStatus !== 'unmatched') return false;
    if (filters.matchStatus === 'matched' && s.matchStatus === 'unmatched') return false;
    if (search) {
      const title = (s.displayTitle ?? s.parsedTitle ?? '').toLowerCase();
      if (!title.includes(search)) return false;
    }
    return true;
  });

  const sorted = filtered.slice();
  switch (filters.sort) {
    case 'alphabetical':
      sorted.sort((a, b) => {
        const aTitle = (a.displayTitle ?? a.parsedTitle ?? '').toLowerCase();
        const bTitle = (b.displayTitle ?? b.parsedTitle ?? '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
      break;
    case 'recently-watched':
      sorted.sort((a, b) => {
        const aLast = seriesProgress[a.id]?.lastWatchedAt ?? '';
        const bLast = seriesProgress[b.id]?.lastWatchedAt ?? '';
        if (aLast === bLast) {
          return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
        }
        // empty strings sort to the bottom
        if (!aLast) return 1;
        if (!bLast) return -1;
        return bLast.localeCompare(aLast);
      });
      break;
    case 'recent':
    default:
      sorted.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      break;
  }
  return sorted;
}
