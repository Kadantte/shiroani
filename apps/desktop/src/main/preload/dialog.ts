import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';

export const dialogApi: ElectronAPI['dialog'] = {
  openDirectory: (options?: unknown) => ipcRenderer.invoke('dialog:open-directory', options),
  openFile: (options?: unknown) => ipcRenderer.invoke('dialog:open-file', options),
  saveFile: (options?: unknown) => ipcRenderer.invoke('dialog:save-file', options),
  message: options => ipcRenderer.invoke('dialog:message', options),
};
