import { useEffect, useState, useCallback } from 'react';
import { createLogger } from '@shiroani/shared';
import { initializeSocket, connectSocket } from '@/lib/socket';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';

const logger = createLogger('AppInit');

/**
 * Initialize the app: fetch backend port, initialize socket, register store listeners, connect.
 * Returns `ready` boolean — views should not render until ready.
 */
export function useAppInitialization(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initScheduleListeners = useScheduleStore(s => s.initListeners);
  const cleanupScheduleListeners = useScheduleStore(s => s.cleanupListeners);
  const initLibraryListeners = useLibraryStore(s => s.initListeners);
  const cleanupLibraryListeners = useLibraryStore(s => s.cleanupListeners);
  const initLocalLibraryListeners = useLocalLibraryStore(s => s.initListeners);
  const cleanupLocalLibraryListeners = useLocalLibraryStore(s => s.cleanupListeners);
  const initFeedListeners = useFeedStore(s => s.initListeners);
  const cleanupFeedListeners = useFeedStore(s => s.cleanupListeners);
  const initConnectionListeners = useConnectionStore(s => s.initListeners);
  const cleanupConnectionListeners = useConnectionStore(s => s.cleanupListeners);
  const initUpdateListeners = useUpdateStore(s => s.initListeners);

  const initAllListeners = useCallback(() => {
    initConnectionListeners();
    initScheduleListeners();
    initLibraryListeners();
    initLocalLibraryListeners();
    initFeedListeners();
  }, [
    initConnectionListeners,
    initScheduleListeners,
    initLibraryListeners,
    initLocalLibraryListeners,
    initFeedListeners,
  ]);

  const cleanupAllListeners = useCallback(() => {
    cleanupConnectionListeners();
    cleanupScheduleListeners();
    cleanupLibraryListeners();
    cleanupLocalLibraryListeners();
    cleanupFeedListeners();
  }, [
    cleanupConnectionListeners,
    cleanupScheduleListeners,
    cleanupLibraryListeners,
    cleanupLocalLibraryListeners,
    cleanupFeedListeners,
  ]);

  useEffect(() => {
    let mounted = true;
    let cleanupUpdate: (() => void) | undefined;

    const init = async () => {
      try {
        logger.info('Initializing app...');

        // Fetch backend port via IPC
        const port = await window.electronAPI?.app?.getBackendPort?.();
        if (port === undefined || port === null) {
          throw new Error('Failed to get backend port — electronAPI not available');
        }
        if (port <= 0 || port > 65535) {
          throw new Error(`Invalid backend port: ${port}`);
        }

        // Initialize socket with the backend port
        initializeSocket(port);

        // Register all socket listeners BEFORE connecting so that onConnect
        // callbacks fire on the initial connection
        initAllListeners();
        logger.info('All listeners registered');

        // Connect to the backend
        await connectSocket();
        if (!mounted) return;
        logger.info('Socket connected');

        // Init updater listeners (IPC-based)
        cleanupUpdate = initUpdateListeners();

        // Load quick access data
        try {
          await useQuickAccessStore.getState().loadSites();
        } catch {
          // Non-critical — quick access will use defaults
        }

        setReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('Failed to initialize:', msg);
        if (mounted) setError(msg);
      }
    };

    init();

    return () => {
      mounted = false;
      cleanupAllListeners();
      cleanupUpdate?.();
    };
  }, [initAllListeners, cleanupAllListeners, initUpdateListeners]);

  return { ready, error };
}
