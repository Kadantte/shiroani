import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface MenuState {
  visible: boolean;
  positionLocked: boolean;
}

export interface MenuAPI {
  onStateUpdate: (callback: (state: MenuState) => void) => void;
  selectItem: (action: string) => void;
  ready: () => void;
}

const menuAPI: MenuAPI = {
  onStateUpdate: (callback: (state: MenuState) => void) => {
    ipcRenderer.on('menu:state', (_event: IpcRendererEvent, state: MenuState) => {
      callback(state);
    });
  },
  selectItem: (action: string) => {
    ipcRenderer.send('menu:select', action);
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
