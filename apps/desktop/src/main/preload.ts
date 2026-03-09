import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
  BrowserTab,
  NotificationSettings,
} from '@shiroani/shared';

/**
 * Create a typed IPC listener that returns an unsubscribe function.
 * Eliminates the repeated on/removeListener boilerplate.
 */
function createIpcListener<T>(channel: string): (callback: (data: T) => void) => () => void {
  return (callback: (data: T) => void) => {
    const handler = (_event: IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  };
}

export interface ElectronAPI {
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
  dialog: {
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
  background: {
    pick: () => Promise<{ fileName: string; url: string } | null>;
    remove: (fileName: string) => Promise<void>;
    getUrl: (fileName: string) => Promise<string | null>;
  };
  app: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
    getBackendPort: () => Promise<number>;
    clipboardWrite: (text: string) => Promise<void>;
    openLogsFolder: () => Promise<void>;
    listLogFiles: () => Promise<Array<{ name: string; size: number; lastModified: number }>>;
    readLogFile: (fileName: string) => Promise<string>;
  };
  browser: {
    createTab: (url?: string) => Promise<string>;
    closeTab: (tabId: string) => Promise<void>;
    switchTab: (tabId: string) => Promise<void>;
    navigate: (tabId: string, url: string) => Promise<void>;
    goBack: (tabId: string) => Promise<void>;
    goForward: (tabId: string) => Promise<void>;
    refresh: (tabId: string) => Promise<void>;
    getTabs: () => Promise<BrowserTab[]>;
    getActiveTab: () => Promise<string | null>;
    toggleAdblock: (enabled: boolean) => Promise<void>;
    resize: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
    executeScript: (tabId: string, script: string) => Promise<unknown>;
    hide: () => Promise<void>;
    show: () => Promise<void>;
    onTabUpdated: (callback: (tab: BrowserTab) => void) => () => void;
    onTabClosed: (callback: (tabId: string) => void) => () => void;
    onFullscreenChange: (callback: (isFullScreen: boolean) => void) => () => void;
  };
  updater: {
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
  notifications: {
    getSettings: () => Promise<NotificationSettings>;
    updateSettings: (updates: Partial<NotificationSettings>) => Promise<NotificationSettings>;
    onClicked: (callback: (data: { mediaId: number; episode: number }) => void) => () => void;
  };
  platform: NodeJS.Platform;
}

const electronAPI: ElectronAPI = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: createIpcListener<boolean>('window:maximized-change'),
  },
  store: {
    get: <T>(key: string) => ipcRenderer.invoke('store:get', key) as Promise<T | undefined>,
    set: <T>(key: string, value: T) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    clear: () => ipcRenderer.invoke('store:clear'),
  },
  dialog: {
    openDirectory: (options?: unknown) => ipcRenderer.invoke('dialog:open-directory', options),
    openFile: (options?: unknown) => ipcRenderer.invoke('dialog:open-file', options),
    message: options => ipcRenderer.invoke('dialog:message', options),
  },
  background: {
    pick: () =>
      ipcRenderer.invoke('background:pick') as Promise<{ fileName: string; url: string } | null>,
    remove: (fileName: string) =>
      ipcRenderer.invoke('background:remove', fileName) as Promise<void>,
    getUrl: (fileName: string) =>
      ipcRenderer.invoke('background:get-url', fileName) as Promise<string | null>,
  },
  app: {
    getPath: (name: string) => ipcRenderer.invoke('app:get-path', name),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getBackendPort: () => ipcRenderer.invoke('app:get-backend-port') as Promise<number>,
    clipboardWrite: (text: string) => ipcRenderer.invoke('app:clipboard-write', text),
    openLogsFolder: () => ipcRenderer.invoke('app:open-logs-folder') as Promise<void>,
    listLogFiles: () => ipcRenderer.invoke('app:list-log-files'),
    readLogFile: (fileName: string) => ipcRenderer.invoke('app:read-log-file', fileName),
  },
  browser: {
    createTab: (url?: string) => ipcRenderer.invoke('browser:create-tab', url) as Promise<string>,
    closeTab: (tabId: string) => ipcRenderer.invoke('browser:close-tab', tabId) as Promise<void>,
    switchTab: (tabId: string) => ipcRenderer.invoke('browser:switch-tab', tabId) as Promise<void>,
    navigate: (tabId: string, url: string) =>
      ipcRenderer.invoke('browser:navigate', tabId, url) as Promise<void>,
    goBack: (tabId: string) => ipcRenderer.invoke('browser:go-back', tabId) as Promise<void>,
    goForward: (tabId: string) => ipcRenderer.invoke('browser:go-forward', tabId) as Promise<void>,
    refresh: (tabId: string) => ipcRenderer.invoke('browser:refresh', tabId) as Promise<void>,
    getTabs: () => ipcRenderer.invoke('browser:get-tabs') as Promise<BrowserTab[]>,
    getActiveTab: () => ipcRenderer.invoke('browser:get-active-tab') as Promise<string | null>,
    toggleAdblock: (enabled: boolean) =>
      ipcRenderer.invoke('browser:toggle-adblock', enabled) as Promise<void>,
    resize: (bounds: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.invoke('browser:resize', bounds) as Promise<void>,
    executeScript: (tabId: string, script: string) =>
      ipcRenderer.invoke('browser:execute-script', tabId, script) as Promise<unknown>,
    hide: () => ipcRenderer.invoke('browser:hide') as Promise<void>,
    show: () => ipcRenderer.invoke('browser:show') as Promise<void>,
    onTabUpdated: createIpcListener<BrowserTab>('browser:tab-updated'),
    onTabClosed: createIpcListener<string>('browser:tab-closed'),
    onFullscreenChange: createIpcListener<boolean>('browser:fullscreen-change'),
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    startDownload: () => ipcRenderer.invoke('updater:start-download'),
    installNow: () => ipcRenderer.invoke('updater:install-now'),
    getChannel: () => ipcRenderer.invoke('updater:get-channel'),
    setChannel: (channel: UpdateChannel) => ipcRenderer.invoke('updater:set-channel', channel),
    onCheckingForUpdate: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('updater:checking-for-update', listener);
      return () => {
        ipcRenderer.removeListener('updater:checking-for-update', listener);
      };
    },
    onUpdateAvailable: createIpcListener<UpdateInfo>('updater:update-available'),
    onUpdateNotAvailable: createIpcListener<UpdateInfo>('updater:update-not-available'),
    onDownloadProgress: createIpcListener<UpdateDownloadProgress>('updater:download-progress'),
    onUpdateDownloaded: createIpcListener<UpdateInfo>('updater:update-downloaded'),
    onUpdateError: createIpcListener<string>('updater:error'),
    onChannelChanged: createIpcListener<UpdateChannel>('updater:channel-changed'),
  },
  notifications: {
    getSettings: () =>
      ipcRenderer.invoke('notifications:get-settings') as Promise<NotificationSettings>,
    updateSettings: (updates: Partial<NotificationSettings>) =>
      ipcRenderer.invoke('notifications:update-settings', updates) as Promise<NotificationSettings>,
    onClicked: createIpcListener<{ mediaId: number; episode: number }>('notifications:clicked'),
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
