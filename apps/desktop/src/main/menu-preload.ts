import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface ThemeColors {
  popover?: string;
  popoverForeground?: string;
  primary?: string;
  border?: string;
  destructive?: string;
  mutedForeground?: string;
}

export interface MenuState {
  visible: boolean;
  positionLocked: boolean;
  theme?: ThemeColors;
}

export interface MenuAPI {
  onStateUpdate: (callback: (state: MenuState) => void) => void;
  onHide: (callback: () => void) => void;
  selectItem: (action: string) => void;
  dismiss: () => void;
  hidden: () => void;
  ready: () => void;
}

const menuAPI: MenuAPI = {
  onStateUpdate: (callback: (state: MenuState) => void) => {
    ipcRenderer.on('menu:state', (_event: IpcRendererEvent, state: MenuState) => {
      callback(state);
    });
  },
  onHide: (callback: () => void) => {
    ipcRenderer.on('menu:hide', () => {
      callback();
    });
  },
  selectItem: (action: string) => {
    ipcRenderer.send('menu:select', action);
  },
  dismiss: () => {
    ipcRenderer.send('menu:dismiss');
  },
  hidden: () => {
    ipcRenderer.send('menu:hidden');
  },
  ready: () => {
    ipcRenderer.send('menu:ready');
  },
};

contextBridge.exposeInMainWorld('menuAPI', menuAPI);

declare global {
  interface Window {
    menuAPI: MenuAPI;
  }
}
