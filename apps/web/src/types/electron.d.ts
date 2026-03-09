import type {
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
  BrowserTab,
  NotificationSettings,
} from '@shiroani/shared';

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
    /** Create a new browser tab, optionally navigating to a URL */
    createTab: (url?: string) => Promise<string>;
    /** Close a browser tab */
    closeTab: (tabId: string) => Promise<void>;
    /** Switch to a browser tab */
    switchTab: (tabId: string) => Promise<void>;
    /** Navigate a browser tab to a URL */
    navigate: (tabId: string, url: string) => Promise<void>;
    /** Go back in browser tab history */
    goBack: (tabId: string) => Promise<void>;
    /** Go forward in browser tab history */
    goForward: (tabId: string) => Promise<void>;
    /** Reload the browser tab */
    refresh: (tabId: string) => Promise<void>;
    /** Get all browser tabs */
    getTabs: () => Promise<BrowserTab[]>;
    /** Get the active tab ID */
    getActiveTab: () => Promise<string | null>;
    /** Toggle adblock enabled/disabled */
    toggleAdblock: (enabled: boolean) => Promise<void>;
    /** Resize the active tab view to the given bounds */
    resize: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
    /** Execute JavaScript in a tab's web contents (for scraping metadata) */
    executeScript: (tabId: string, script: string) => Promise<unknown>;
    /** Hide all browser views (when switching to another app section) */
    hide: () => Promise<void>;
    /** Show the active browser view (when switching back to browser) */
    show: () => Promise<void>;
    /** Listen for tab state updates */
    onTabUpdated: (callback: (tab: BrowserTab) => void) => () => void;
    /** Listen for tab close events */
    onTabClosed: (callback: (tabId: string) => void) => () => void;
    /** Listen for HTML5 fullscreen enter/leave events */
    onFullscreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
  };
  background?: {
    /** Open file dialog, copy image to userData/backgrounds, return fileName and protocol URL */
    pick: () => Promise<{ fileName: string; url: string } | null>;
    /** Remove a background image file from userData/backgrounds */
    remove: (fileName: string) => Promise<void>;
    /** Get the protocol URL for a background image file (null if file doesn't exist) */
    getUrl: (fileName: string) => Promise<string | null>;
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
  notifications?: {
    getSettings: () => Promise<NotificationSettings>;
    updateSettings: (updates: Partial<NotificationSettings>) => Promise<NotificationSettings>;
    onClicked: (callback: (data: { mediaId: number; episode: number }) => void) => () => void;
  };
  overlay?: {
    show: () => Promise<{ success: boolean }>;
    hide: () => Promise<{ success: boolean }>;
    toggle: () => Promise<{ success: boolean; visible: boolean }>;
    getStatus: () => Promise<{ enabled: boolean; visible: boolean; x: number; y: number }>;
    setEnabled: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
    isEnabled: () => Promise<boolean>;
    setSize: (size: number) => Promise<{ success: boolean; size: number }>;
    getSize: () => Promise<number>;
    setVisibilityMode: (mode: string) => Promise<{ success: boolean; mode: string }>;
    getVisibilityMode: () => Promise<string>;
    setPositionLocked: (locked: boolean) => Promise<{ success: boolean; locked: boolean }>;
    isPositionLocked: () => Promise<boolean>;
    resetPosition: () => Promise<{ success: boolean }>;
    onNavigate: (callback: (view: string) => void) => () => void;
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
