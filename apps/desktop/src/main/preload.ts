import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
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

/**
 * Channels allowed for generic IPC helpers. Restricts the surface exposed
 * via contextBridge so renderer code cannot invoke arbitrary handlers.
 */
const ALLOWED_IPC_CHANNELS = new Set([
  'window:is-maximized',
  'store:get',
  'store:set',
  'store:delete',
  'app:get-version',
  'app:get-backend-port',
  'app:get-path',
  'app:clipboard-write',
  'app:open-logs-folder',
  'app:list-log-files',
  'app:read-log-file',
  'app:get-auto-launch',
  'app:set-auto-launch',
  'dialog:open-directory',
  'dialog:open-file',
  'dialog:save-file',
  'dialog:message',
  'file:write-json',
  'file:read-json',
  'background:pick',
  'background:remove',
  'background:get-url',
  'browser:toggle-adblock',
  'browser:set-fullscreen',
  'browser:get-popup-block-mode',
  'browser:set-popup-block-mode',
  'updater:check-for-updates',
  'updater:start-download',
  'updater:install-now',
  'updater:get-channel',
  'updater:set-channel',
  'notifications:get-settings',
  'notifications:update-settings',
  'notifications:get-subscriptions',
  'notifications:add-subscription',
  'notifications:remove-subscription',
  'notifications:toggle-subscription',
  'notifications:is-subscribed',
  'discord-rpc:get-settings',
  'discord-rpc:update-settings',
  'discord-rpc:update-presence',
  'discord-rpc:clear-presence',
  'overlay:show',
  'overlay:hide',
  'overlay:toggle',
  'overlay:get-status',
  'overlay:set-enabled',
  'overlay:is-enabled',
  'overlay:set-size',
  'overlay:get-size',
  'overlay:set-visibility-mode',
  'overlay:get-visibility-mode',
  'overlay:set-position-locked',
  'overlay:get-position-locked',
  'overlay:reset-position',
]);

function assertAllowedChannel(channel: string): void {
  if (!ALLOWED_IPC_CHANNELS.has(channel)) {
    throw new Error(`IPC channel not allowed: "${channel}"`);
  }
}

/**
 * IPC invoke with timeout.
 * Races ipcRenderer.invoke against a timer so the renderer never hangs
 * if the main process fails to respond. Restricted to allowed channels.
 */
function invokeWithTimeout<T>(channel: string, timeout: number, ...args: unknown[]): Promise<T> {
  assertAllowedChannel(channel);
  const invokePromise = ipcRenderer.invoke(channel, ...args) as Promise<T>;
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`IPC timeout: "${channel}" did not respond within ${timeout}ms`));
      // Swallow any late rejection to prevent unhandled promise rejection
      invokePromise.catch(() => {});
    }, timeout);
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }
  });
  return Promise.race([invokePromise.finally(() => clearTimeout(timer)), timeoutPromise]);
}

/**
 * Cancellable IPC invoke.
 * Returns a handle with `promise` and `cancel()`. Calling `cancel()` rejects
 * the promise with a cancellation error. Restricted to allowed channels.
 */
function cancellableInvoke<T>(
  channel: string,
  ...args: unknown[]
): { promise: Promise<T>; cancel: () => void } {
  assertAllowedChannel(channel);
  let settled = false;
  let rejectFn: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    rejectFn = reject;
    ipcRenderer
      .invoke(channel, ...args)
      .then((result: T) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      })
      .catch((error: unknown) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
  });
  const cancel = () => {
    if (settled) return;
    settled = true;
    rejectFn?.(new Error(`IPC request cancelled: "${channel}"`));
  };
  return { promise, cancel };
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
  };
  dialog: {
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
  file: {
    writeJson: (filePath: string, jsonString: string) => Promise<{ success: boolean }>;
    readJson: (filePath: string) => Promise<string>;
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
    getAutoLaunch: () => Promise<boolean>;
    setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  };
  browser: {
    toggleAdblock: (enabled: boolean) => Promise<void>;
    setFullscreen: (isFullscreen: boolean) => Promise<void>;
    getPopupBlockMode: () => Promise<string>;
    setPopupBlockMode: (mode: string) => Promise<void>;
    onNewWindowRequest: (callback: (url: string) => void) => () => void;
    onShortcut: (
      callback: (data: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }) => void
    ) => () => void;
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
    getSubscriptions: () => Promise<NotificationSubscription[]>;
    addSubscription: (
      subscription: NotificationSubscription
    ) => Promise<NotificationSubscription[]>;
    removeSubscription: (anilistId: number) => Promise<NotificationSubscription[]>;
    toggleSubscription: (anilistId: number) => Promise<NotificationSubscription[]>;
    isSubscribed: (anilistId: number) => Promise<boolean>;
    onClicked: (callback: (data: { mediaId: number; episode: number }) => void) => () => void;
  };
  discordRpc: {
    getSettings: () => Promise<DiscordRpcSettings>;
    updateSettings: (updates: Partial<DiscordRpcSettings>) => Promise<DiscordRpcSettings>;
    updatePresence: (activity: DiscordPresenceActivity) => Promise<void>;
    clearPresence: () => Promise<void>;
  };
  overlay: {
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
  ipc: {
    invokeWithTimeout: <T>(channel: string, timeout: number, ...args: unknown[]) => Promise<T>;
    cancellableInvoke: <T>(
      channel: string,
      ...args: unknown[]
    ) => { promise: Promise<T>; cancel: () => void };
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
  },
  dialog: {
    openDirectory: (options?: unknown) => ipcRenderer.invoke('dialog:open-directory', options),
    openFile: (options?: unknown) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options?: unknown) => ipcRenderer.invoke('dialog:save-file', options),
    message: options => ipcRenderer.invoke('dialog:message', options),
  },
  file: {
    writeJson: (filePath: string, jsonString: string) =>
      ipcRenderer.invoke('file:write-json', filePath, jsonString),
    readJson: (filePath: string) => ipcRenderer.invoke('file:read-json', filePath),
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
    getAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch') as Promise<boolean>,
    setAutoLaunch: (enabled: boolean) =>
      ipcRenderer.invoke('app:set-auto-launch', enabled) as Promise<boolean>,
  },
  browser: {
    toggleAdblock: (enabled: boolean) =>
      ipcRenderer.invoke('browser:toggle-adblock', enabled) as Promise<void>,
    setFullscreen: (isFullscreen: boolean) =>
      ipcRenderer.invoke('browser:set-fullscreen', isFullscreen) as Promise<void>,
    getPopupBlockMode: () => ipcRenderer.invoke('browser:get-popup-block-mode') as Promise<string>,
    setPopupBlockMode: (mode: string) =>
      ipcRenderer.invoke('browser:set-popup-block-mode', mode) as Promise<void>,
    onNewWindowRequest: createIpcListener<string>('browser:new-window-request'),
    onShortcut: createIpcListener<{ key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }>(
      'browser:shortcut'
    ),
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
    getSubscriptions: () =>
      ipcRenderer.invoke('notifications:get-subscriptions') as Promise<NotificationSubscription[]>,
    addSubscription: (subscription: NotificationSubscription) =>
      ipcRenderer.invoke('notifications:add-subscription', subscription) as Promise<
        NotificationSubscription[]
      >,
    removeSubscription: (anilistId: number) =>
      ipcRenderer.invoke('notifications:remove-subscription', anilistId) as Promise<
        NotificationSubscription[]
      >,
    toggleSubscription: (anilistId: number) =>
      ipcRenderer.invoke('notifications:toggle-subscription', anilistId) as Promise<
        NotificationSubscription[]
      >,
    isSubscribed: (anilistId: number) =>
      ipcRenderer.invoke('notifications:is-subscribed', anilistId) as Promise<boolean>,
    onClicked: createIpcListener<{ mediaId: number; episode: number }>('notifications:clicked'),
  },
  discordRpc: {
    getSettings: () =>
      ipcRenderer.invoke('discord-rpc:get-settings') as Promise<DiscordRpcSettings>,
    updateSettings: (updates: Partial<DiscordRpcSettings>) =>
      ipcRenderer.invoke('discord-rpc:update-settings', updates) as Promise<DiscordRpcSettings>,
    updatePresence: (activity: DiscordPresenceActivity) =>
      ipcRenderer.invoke('discord-rpc:update-presence', activity) as Promise<void>,
    clearPresence: () => ipcRenderer.invoke('discord-rpc:clear-presence') as Promise<void>,
  },
  overlay: {
    show: () => ipcRenderer.invoke('overlay:show'),
    hide: () => ipcRenderer.invoke('overlay:hide'),
    toggle: () => ipcRenderer.invoke('overlay:toggle'),
    getStatus: () =>
      ipcRenderer.invoke('overlay:get-status') as Promise<{
        enabled: boolean;
        visible: boolean;
        x: number;
        y: number;
      }>,
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('overlay:set-enabled', enabled),
    isEnabled: () => ipcRenderer.invoke('overlay:is-enabled') as Promise<boolean>,
    setSize: (size: number) => ipcRenderer.invoke('overlay:set-size', size),
    getSize: () => ipcRenderer.invoke('overlay:get-size') as Promise<number>,
    setVisibilityMode: (mode: string) => ipcRenderer.invoke('overlay:set-visibility-mode', mode),
    getVisibilityMode: () => ipcRenderer.invoke('overlay:get-visibility-mode') as Promise<string>,
    setPositionLocked: (locked: boolean) =>
      ipcRenderer.invoke('overlay:set-position-locked', locked),
    isPositionLocked: () => ipcRenderer.invoke('overlay:get-position-locked') as Promise<boolean>,
    resetPosition: () => ipcRenderer.invoke('overlay:reset-position'),
    onNavigate: createIpcListener<string>('navigate'),
  },
  ipc: {
    invokeWithTimeout: <T>(channel: string, timeout: number, ...args: unknown[]) =>
      invokeWithTimeout<T>(channel, timeout, ...args),
    cancellableInvoke: <T>(channel: string, ...args: unknown[]) =>
      cancellableInvoke<T>(channel, ...args),
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
