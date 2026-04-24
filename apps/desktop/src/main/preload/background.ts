import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';

export const backgroundApi: ElectronAPI['background'] = {
  pick: () =>
    ipcRenderer.invoke('background:pick') as Promise<{ fileName: string; url: string } | null>,
  remove: (fileName: string) => ipcRenderer.invoke('background:remove', fileName) as Promise<void>,
  getUrl: (fileName: string) =>
    ipcRenderer.invoke('background:get-url', fileName) as Promise<string | null>,
};
