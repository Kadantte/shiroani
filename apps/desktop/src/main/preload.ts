import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
  BrowserTab,
} from '@shiroani/shared';

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
    hide: () => Promise<void>;
    show: () => Promise<void>;
    onTabUpdated: (callback: (tab: BrowserTab) => void) => () => void;
    onTabClosed: (callback: (tabId: string) => void) => () => void;
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
  platform: NodeJS.Platform;
}

const electronAPI: ElectronAPI = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => {
        callback(maximized);
      };
      ipcRenderer.on('window:maximized-change', listener);
      return () => {
        ipcRenderer.removeListener('window:maximized-change', listener);
      };
    },
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
    hide: () => ipcRenderer.invoke('browser:hide') as Promise<void>,
    show: () => ipcRenderer.invoke('browser:show') as Promise<void>,
    onTabUpdated: (callback: (tab: BrowserTab) => void) => {
      const handler = (_event: IpcRendererEvent, tab: BrowserTab) => callback(tab);
      ipcRenderer.on('browser:tab-updated', handler);
      return () => {
        ipcRenderer.removeListener('browser:tab-updated', handler);
      };
    },
    onTabClosed: (callback: (tabId: string) => void) => {
      const handler = (_event: IpcRendererEvent, tabId: string) => callback(tabId);
      ipcRenderer.on('browser:tab-closed', handler);
      return () => {
        ipcRenderer.removeListener('browser:tab-closed', handler);
      };
    },
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
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('updater:update-available', listener);
      return () => {
        ipcRenderer.removeListener('updater:update-available', listener);
      };
    },
    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('updater:update-not-available', listener);
      return () => {
        ipcRenderer.removeListener('updater:update-not-available', listener);
      };
    },
    onDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: UpdateDownloadProgress) =>
        callback(progress);
      ipcRenderer.on('updater:download-progress', listener);
      return () => {
        ipcRenderer.removeListener('updater:download-progress', listener);
      };
    },
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('updater:update-downloaded', listener);
      return () => {
        ipcRenderer.removeListener('updater:update-downloaded', listener);
      };
    },
    onUpdateError: (callback: (message: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
      ipcRenderer.on('updater:error', listener);
      return () => {
        ipcRenderer.removeListener('updater:error', listener);
      };
    },
    onChannelChanged: (callback: (channel: UpdateChannel) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, channel: UpdateChannel) =>
        callback(channel);
      ipcRenderer.on('updater:channel-changed', listener);
      return () => {
        ipcRenderer.removeListener('updater:channel-changed', listener);
      };
    },
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
