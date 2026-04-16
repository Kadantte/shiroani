import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import {
  LocalLibraryEvents,
  createLogger,
  type LibraryRoot,
  type LocalSeries,
  type LocalLibraryRootsResult,
  type LocalLibrarySeriesResult,
  type LocalLibraryRootAddedResult,
  type LocalLibraryRootRemovedResult,
  type LocalLibraryScanPhase,
  type LocalLibraryScanStartedPayload,
  type LocalLibraryScanProgressPayload,
  type LocalLibraryScanDonePayload,
  type LocalLibraryScanFailedPayload,
  type LocalLibraryScanCancelledPayload,
  type LocalLibrarySeriesUpdatedPayload,
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

interface LocalLibraryState extends SocketStoreSlice {
  roots: LibraryRoot[];
  series: LocalSeries[];
  /** Path currently being submitted (add-root in flight) — disables UI. */
  isAddingRoot: boolean;
  /** Active scan state keyed by rootId. */
  scanProgress: Record<number, ScanProgressSnapshot>;
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
  /** Request cancellation of an in-flight scan. */
  cancelScan: (rootId: number) => Promise<void>;
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
                    return {
                      roots: state.roots.filter(r => r.id !== id),
                      series: state.series.filter(s => s.rootId !== id),
                      scanProgress: remainingScans,
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
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        roots: [],
        series: [],
        isAddingRoot: false,
        scanProgress: {},

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

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'localLibrary' }
  )
);
