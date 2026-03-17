import type {
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
  NotificationSettings,
  NotificationSubscription,
  DiscordRpcSettings,
  DiscordPresenceActivity,
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
  };
  dialog?: {
    openDirectory: (options?: unknown) => Promise<string | null>;
    openFile: (options?: unknown) => Promise<string | null>;
    saveFile: (options?: unknown) => Promise<string | null>;
    message: (options: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning';
      title?: string;
      message: string;
      detail?: string;
      buttons?: string[];
    }) => Promise<number>;
  };
  file?: {
    writeJson: (filePath: string, jsonString: string) => Promise<{ success: boolean }>;
    readJson: (filePath: string) => Promise<string>;
  };
  app?: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
    openLogsFolder: () => Promise<void>;
    clipboardWrite: (text: string) => Promise<void>;
    getBackendPort: () => Promise<number>;
    listLogFiles: () => Promise<Array<{ name: string; size: number; lastModified: number }>>;
    readLogFile: (fileName: string) => Promise<string>;
    getAutoLaunch: () => Promise<boolean>;
    setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  };
  browser?: {
    toggleAdblock: (enabled: boolean) => Promise<void>;
    setFullscreen: (fullscreen: boolean) => Promise<void>;
    onNewWindowRequest: (callback: (url: string) => void) => () => void;
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
    getSubscriptions: () => Promise<NotificationSubscription[]>;
    addSubscription: (
      subscription: NotificationSubscription
    ) => Promise<NotificationSubscription[]>;
    removeSubscription: (anilistId: number) => Promise<NotificationSubscription[]>;
    toggleSubscription: (anilistId: number) => Promise<NotificationSubscription[]>;
    isSubscribed: (anilistId: number) => Promise<boolean>;
    onClicked: (callback: (data: { mediaId: number; episode: number }) => void) => () => void;
  };
  discordRpc?: {
    getSettings: () => Promise<DiscordRpcSettings>;
    updateSettings: (updates: Partial<DiscordRpcSettings>) => Promise<DiscordRpcSettings>;
    updatePresence: (activity: DiscordPresenceActivity) => Promise<void>;
    clearPresence: () => Promise<void>;
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
