import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import {
  FfmpegEvents,
  createLogger,
  type FfmpegStatus,
  type FfmpegInstallProgress,
  type FfmpegStatusResult,
  type FfmpegSetSystemPathsResult,
  type FfmpegInstallDoneResult,
} from '@shiroani/shared';

// emitWithErrorHandling auto-throws when a response has an `error` field,
// which the gateway uses as a success-path signal on some calls. For those
// we explicitly check `success` before persisting state and treat the error
// as a user-facing validation message rather than a transport-level failure.
import { emitWithErrorHandling } from '@/lib/socket';
import { emitAsync } from '@/lib/socketHelpers';

const logger = createLogger('FfmpegStore');

/**
 * Default status used before we've heard from the backend. Presented as
 * "bundled not supported, not installed" — a safe pessimistic view that
 * reveals no system paths until the server confirms them.
 */
const INITIAL_STATUS: FfmpegStatus = {
  mode: 'none',
  installed: false,
  ffmpegPath: null,
  ffprobePath: null,
  version: null,
  platform: 'win32',
  bundledSupported: false,
};

const INITIAL_PROGRESS: FfmpegInstallProgress = {
  phase: 'idle',
  bytes: 0,
  total: 0,
  speed: 0,
};

interface FfmpegState extends SocketStoreSlice {
  status: FfmpegStatus;
  progress: FfmpegInstallProgress;
  /** Most recent error message from an install / validation. */
  lastError: string | null;
}

interface FfmpegActions {
  refreshStatus: () => Promise<void>;
  /**
   * Kick off an install — resolves once the backend has accepted the
   * request (`started: true`). Progress and terminal state arrive via socket
   * broadcasts and land in the store automatically.
   */
  install: () => Promise<{ started: boolean; reason?: string }>;
  cancel: () => Promise<void>;
  uninstall: () => Promise<void>;
  setSystemPaths: (
    ffmpegPath: string,
    ffprobePath: string
  ) => Promise<FfmpegSetSystemPathsResult | null>;
  clearSystemPaths: () => Promise<void>;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type FfmpegStore = FfmpegState & FfmpegActions;

export const useFfmpegStore = create<FfmpegStore>()(
  devtools(
    (set, get) => {
      const socketActions = createSocketActions<FfmpegStore>(set, 'ffmpeg');

      const { initListeners, cleanupListeners } = createSocketListeners<FfmpegStore>(
        get,
        set,
        'ffmpeg',
        {
          listeners: [
            {
              event: FfmpegEvents.INSTALL_START,
              handler: () => {
                set(
                  {
                    progress: { phase: 'resolve', bytes: 0, total: 0, speed: 0 },
                    lastError: null,
                  },
                  undefined,
                  'ffmpeg/installStart'
                );
              },
            },
            {
              event: FfmpegEvents.INSTALL_PROGRESS,
              handler: data => {
                const progress = data as FfmpegInstallProgress | undefined;
                if (!progress || typeof progress.phase !== 'string') return;
                set({ progress }, undefined, 'ffmpeg/installProgress');
              },
            },
            {
              event: FfmpegEvents.INSTALL_DONE,
              handler: data => {
                const result = data as FfmpegInstallDoneResult | undefined;
                if (!result) return;
                set(
                  {
                    status: result.status,
                    progress: { phase: 'done', bytes: 0, total: 0, speed: 0 },
                    lastError: null,
                  },
                  undefined,
                  'ffmpeg/installDone'
                );
              },
            },
            {
              event: FfmpegEvents.INSTALL_FAILED,
              handler: data => {
                const result = data as FfmpegInstallDoneResult | undefined;
                set(
                  {
                    status: result?.status ?? get().status,
                    progress: {
                      phase: 'failed',
                      bytes: 0,
                      total: 0,
                      speed: 0,
                      detail: result?.error,
                    },
                    lastError: result?.error ?? 'Install failed',
                  },
                  undefined,
                  'ffmpeg/installFailed'
                );
              },
            },
            {
              event: FfmpegEvents.INSTALL_CANCELLED,
              handler: data => {
                const result = data as FfmpegInstallDoneResult | undefined;
                set(
                  {
                    status: result?.status ?? get().status,
                    progress: { phase: 'cancelled', bytes: 0, total: 0, speed: 0 },
                    lastError: null,
                  },
                  undefined,
                  'ffmpeg/installCancelled'
                );
              },
            },
            {
              event: FfmpegEvents.STATUS_RESULT,
              handler: data => {
                const result = data as FfmpegStatusResult | undefined;
                if (result?.status) {
                  set({ status: result.status }, undefined, 'ffmpeg/statusResult');
                }
              },
            },
          ],
          onConnect: get => {
            void get().refreshStatus();
          },
        }
      );

      return {
        ...initialSocketState,
        status: INITIAL_STATUS,
        progress: INITIAL_PROGRESS,
        lastError: null,

        ...socketActions,

        refreshStatus: async () => {
          try {
            const data = await emitWithErrorHandling<Record<string, never>, FfmpegStatusResult>(
              FfmpegEvents.STATUS,
              {}
            );
            set({ status: data.status }, undefined, 'ffmpeg/refreshStatus');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to fetch ffmpeg status:', message);
            set({ error: message }, undefined, 'ffmpeg/refreshStatusError');
          }
        },

        install: async () => {
          try {
            set(
              {
                progress: { phase: 'resolve', bytes: 0, total: 0, speed: 0 },
                lastError: null,
              },
              undefined,
              'ffmpeg/installRequest'
            );
            const result = await emitWithErrorHandling<
              Record<string, never>,
              { started: boolean; reason?: string }
            >(FfmpegEvents.INSTALL, {});
            if (!result.started && result.reason) {
              set(
                {
                  lastError: result.reason,
                  progress: { phase: 'idle', bytes: 0, total: 0, speed: 0 },
                },
                undefined,
                'ffmpeg/installRejected'
              );
            }
            return result;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to install ffmpeg:', message);
            set(
              {
                lastError: message,
                progress: { phase: 'failed', bytes: 0, total: 0, speed: 0, detail: message },
              },
              undefined,
              'ffmpeg/installError'
            );
            return { started: false, reason: message };
          }
        },

        cancel: async () => {
          try {
            await emitWithErrorHandling<Record<string, never>, { success: boolean }>(
              FfmpegEvents.CANCEL,
              {}
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to cancel ffmpeg install:', message);
          }
        },

        uninstall: async () => {
          try {
            const result = await emitWithErrorHandling<
              Record<string, never>,
              { success: boolean; status: FfmpegStatus }
            >(FfmpegEvents.UNINSTALL, {});
            if (result?.status) {
              set(
                {
                  status: result.status,
                  progress: INITIAL_PROGRESS,
                  lastError: null,
                },
                undefined,
                'ffmpeg/uninstall'
              );
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to uninstall ffmpeg:', message);
            set({ lastError: message }, undefined, 'ffmpeg/uninstallError');
          }
        },

        setSystemPaths: async (ffmpegPath, ffprobePath) => {
          try {
            // Raw emitAsync — the gateway's failure case returns the shape
            // `{ success: false, status, error: '...' }`; the auto-throwing
            // helper would treat `error` as a transport failure rather than
            // a validation message.
            const result = await emitAsync<
              { ffmpegPath: string; ffprobePath: string },
              FfmpegSetSystemPathsResult
            >(FfmpegEvents.SET_SYSTEM_PATHS, { ffmpegPath, ffprobePath });
            if (result?.status) {
              set(
                {
                  status: result.status,
                  lastError: result.success ? null : (result.error ?? null),
                },
                undefined,
                'ffmpeg/setSystemPaths'
              );
            }
            return result;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to set system ffmpeg paths:', message);
            set({ lastError: message }, undefined, 'ffmpeg/setSystemPathsError');
            return null;
          }
        },

        clearSystemPaths: async () => {
          try {
            const result = await emitWithErrorHandling<
              Record<string, never>,
              { success: boolean; status: FfmpegStatus }
            >(FfmpegEvents.CLEAR_SYSTEM_PATHS, {});
            if (result?.status) {
              set({ status: result.status }, undefined, 'ffmpeg/clearSystemPaths');
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to clear system ffmpeg paths:', message);
          }
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'ffmpeg' }
  )
);
