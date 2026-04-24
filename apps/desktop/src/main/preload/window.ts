import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const windowApi: ElectronAPI['window'] = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: createIpcListener<boolean>('window:maximized-change'),
  openDevTools: () => ipcRenderer.invoke('window:open-devtools') as Promise<void>,
};
