import { ipcRenderer } from 'electron';
import type { AppStatsSnapshot, ElectronAPI } from '@shiroani/shared';

export const appStatsApi: ElectronAPI['appStats'] = {
  getSnapshot: () => ipcRenderer.invoke('app-stats:get-snapshot') as Promise<AppStatsSnapshot>,
  setWatchingAnime: (watching: boolean) =>
    ipcRenderer.invoke('app-stats:set-watching-anime', watching) as Promise<void>,
  reset: () => ipcRenderer.invoke('app-stats:reset') as Promise<AppStatsSnapshot>,
};
