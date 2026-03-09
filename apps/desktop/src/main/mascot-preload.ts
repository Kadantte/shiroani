import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface MascotConfig {
  spritePath: string;
  positionLocked: boolean;
}

export interface MascotAPI {
  onConfig: (callback: (config: MascotConfig) => void) => void;
  onPositionLocked: (callback: (locked: boolean) => void) => void;
  startDrag: (screenX: number, screenY: number) => void;
  drag: (dx: number, dy: number) => void;
  endDrag: () => void;
  contextMenu: (screenX: number, screenY: number) => void;
}

const mascotAPI: MascotAPI = {
  onConfig: (callback: (config: MascotConfig) => void) => {
    ipcRenderer.on('mascot:config', (_event: IpcRendererEvent, config: MascotConfig) => {
      callback(config);
    });
  },
  onPositionLocked: (callback: (locked: boolean) => void) => {
    ipcRenderer.on('mascot:position-locked', (_event: IpcRendererEvent, locked: boolean) => {
      callback(locked);
    });
  },
  startDrag: (screenX: number, screenY: number) => {
    ipcRenderer.send('mascot:start-drag', screenX, screenY);
  },
  drag: (dx: number, dy: number) => {
    ipcRenderer.send('mascot:drag', dx, dy);
  },
  endDrag: () => {
    ipcRenderer.send('mascot:end-drag');
  },
  contextMenu: (screenX: number, screenY: number) => {
    ipcRenderer.send('mascot:context-menu', screenX, screenY);
  },
};

contextBridge.exposeInMainWorld('mascotAPI', mascotAPI);

declare global {
  interface Window {
    mascotAPI: MascotAPI;
  }
}
