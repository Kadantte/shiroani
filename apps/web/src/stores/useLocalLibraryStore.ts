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
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { IS_ELECTRON } from '@/lib/platform';

const logger = createLogger('LocalLibraryStore');

interface LocalLibraryState extends SocketStoreSlice {
  roots: LibraryRoot[];
  series: LocalSeries[];
  /** Path currently being submitted (add-root in flight) — disables UI. */
  isAddingRoot: boolean;
}

interface LocalLibraryActions {
  refreshRoots: () => void;
  refreshSeries: (rootId?: number) => void;
  addRoot: (path: string, label?: string) => Promise<LibraryRoot | null>;
  removeRoot: (id: number) => Promise<void>;
  /** Open the native folder picker then add the chosen folder as a root. */
  pickAndAddRoot: () => Promise<LibraryRoot | null>;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type LocalLibraryStore = LocalLibraryState & LocalLibraryActions;

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
                    // De-dupe — the gateway may have emitted back to the same
                    // client that invoked addRoot and already updated locally.
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
                  state => ({
                    roots: state.roots.filter(r => r.id !== id),
                    // Drop series belonging to the removed root.
                    series: state.series.filter(s => s.rootId !== id),
                  }),
                  undefined,
                  'localLibrary/rootRemoved'
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
          return get().addRoot(result.path);
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'localLibrary' }
  )
);
