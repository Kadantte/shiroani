import { ipcRenderer } from 'electron';
import type { ElectronAPI, RendererLogWriteEntry } from '@shiroani/shared';

export const logApi: ElectronAPI['log'] = {
  write: (entry: RendererLogWriteEntry) =>
    (ipcRenderer.invoke('app:log-write', entry) as Promise<void>).catch(() => {
      // Swallow — log forwarding failures must never reach the renderer.
    }),
};
