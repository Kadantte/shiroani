import type { UpdateInfo, UpdateDownloadProgress, UpdateChannel } from '@shiroani/shared';

/**
 * Electron API exposed via contextBridge
 */
interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
  };
  store: {
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  dialog?: {
    openDirectory: (options?: unknown) => Promise<string | null>;
    openFile: (options?: unknown) => Promise<string | null>;
    message: (options: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning';
      title?: string;
      message: string;
      detail?: string;
      buttons?: string[];
    }) => Promise<number>;
  };
  app?: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
    openLogsFolder: () => Promise<void>;
    clipboardWrite: (text: string) => Promise<void>;
    getBackendPort: () => Promise<number>;
    listLogFiles: () => Promise<Array<{ name: string; size: number; lastModified: number }>>;
    readLogFile: (fileName: string) => Promise<string>;
  };
  browser?: {
    /** Create a new browser view for a tab */
    createView: (tabId: string, url: string) => Promise<void>;
    /** Destroy a browser view */
    destroyView: (tabId: string) => Promise<void>;
    /** Show a specific browser view */
    showView: (tabId: string) => Promise<void>;
    /** Navigate a browser view to a URL */
    navigate: (tabId: string, url: string) => Promise<void>;
    /** Go back in browser view history */
    goBack: (tabId: string) => Promise<void>;
    /** Go forward in browser view history */
    goForward: (tabId: string) => Promise<void>;
    /** Reload the browser view */
    reload: (tabId: string) => Promise<void>;
    /** Set adblock enabled/disabled */
    setAdblock: (enabled: boolean) => Promise<void>;
    /** Listen for navigation state changes */
    onNavigationStateChanged: (
      callback: (
        tabId: string,
        state: {
          url: string;
          title: string;
          canGoBack: boolean;
          canGoForward: boolean;
          isLoading: boolean;
        }
      ) => void
    ) => () => void;
  };
  updater?: {
    checkForUpdates: () => Promise<{ enabled: boolean; channel: UpdateChannel }>;
    startDownload: () => Promise<void>;
    installNow: () => Promise<void>;
    getChannel: () => Promise<UpdateChannel>;
    setChannel: (channel: UpdateChannel) => Promise<UpdateChannel>;
    onCheckingForUpdate: (callback: () => void) => () => void;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void;
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateError: (callback: (message: string) => void) => () => void;
    onChannelChanged: (callback: (channel: UpdateChannel) => void) => () => void;
  };
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __testStores?: Record<string, unknown>;
    __testSocket?: unknown;
  }
}

export {};
