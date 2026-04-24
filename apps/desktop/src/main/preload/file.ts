import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';

export const fileApi: ElectronAPI['file'] = {
  writeJson: (filePath: string, jsonString: string) =>
    ipcRenderer.invoke('file:write-json', filePath, jsonString),
  readJson: (filePath: string) => ipcRenderer.invoke('file:read-json', filePath),
};
