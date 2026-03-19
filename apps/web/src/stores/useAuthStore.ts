import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@shiroani/shared';
import type { DiscordUser, AuthState } from '@shiroani/shared';

const logger = createLogger('AuthStore');

interface AuthStoreState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Discord user info (null if not logged in) */
  user: DiscordUser | null;
  /** Whether a login attempt is in progress */
  isLoggingIn: boolean;
  /** Last error message */
  error: string | null;
}

interface AuthStoreActions {
  /** Start the Discord OAuth login flow */
  login: () => Promise<void>;
  /** Log out and clear auth state */
  logout: () => Promise<void>;
  /** Load persisted auth state from the main process */
  loadAuthState: () => Promise<void>;
  /** Register IPC event listeners */
  initListeners: () => void;
  /** Remove IPC event listeners */
  cleanupListeners: () => void;
}

type AuthStore = AuthStoreState & AuthStoreActions;

// Module-level unsubscribe handles for IPC listeners
let unsubLoginSuccess: (() => void) | null = null;
let unsubLoginError: (() => void) | null = null;
let listenersInitialized = false;

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      isLoggingIn: false,
      error: null,

      loadAuthState: async () => {
        try {
          const state: AuthState | undefined = await window.electronAPI?.auth?.getState();
          if (state) {
            set(
              {
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                error: null,
              },
              undefined,
              'auth/loaded'
            );
          }
        } catch (error) {
          logger.error('Failed to load auth state:', error);
        }
      },

      login: async () => {
        if (get().isLoggingIn) return;
        set({ isLoggingIn: true, error: null }, undefined, 'auth/loginStarted');

        try {
          await window.electronAPI?.auth?.loginDiscord();
          // Success/error will be handled by IPC listeners
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          logger.error('Login failed:', error);
          set({ isLoggingIn: false, error: message }, undefined, 'auth/loginError');
        }
      },

      logout: async () => {
        try {
          await window.electronAPI?.auth?.logout();
          set({ isAuthenticated: false, user: null, error: null }, undefined, 'auth/loggedOut');
          logger.info('Logged out');
        } catch (error) {
          logger.error('Logout failed:', error);
        }
      },

      initListeners: () => {
        if (listenersInitialized) return;

        unsubLoginSuccess =
          window.electronAPI?.auth?.onLoginSuccess((user: DiscordUser) => {
            logger.info('Login success:', user?.username);
            set(
              {
                isAuthenticated: true,
                user,
                isLoggingIn: false,
                error: null,
              },
              undefined,
              'auth/loginSuccess'
            );
          }) ?? null;

        unsubLoginError =
          window.electronAPI?.auth?.onLoginError((message: string) => {
            logger.error('Login error:', message);
            set({ isLoggingIn: false, error: message }, undefined, 'auth/loginError');
          }) ?? null;

        listenersInitialized = true;
        logger.debug('Auth listeners registered');
      },

      cleanupListeners: () => {
        if (unsubLoginSuccess) {
          unsubLoginSuccess();
          unsubLoginSuccess = null;
        }
        if (unsubLoginError) {
          unsubLoginError();
          unsubLoginError = null;
        }
        listenersInitialized = false;
        logger.debug('Auth listeners cleaned up');
      },
    }),
    { name: 'auth' }
  )
);
