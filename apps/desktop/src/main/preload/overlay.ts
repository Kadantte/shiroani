import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const overlayApi: ElectronAPI['overlay'] = {
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
  setPositionLocked: (locked: boolean) => ipcRenderer.invoke('overlay:set-position-locked', locked),
  isPositionLocked: () => ipcRenderer.invoke('overlay:get-position-locked') as Promise<boolean>,
  resetPosition: () => ipcRenderer.invoke('overlay:reset-position'),
  onNavigate: createIpcListener<string>('navigate'),
};
