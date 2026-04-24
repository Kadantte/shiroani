import { contextBridge } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';
import { electronAPI } from './preload/index';

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
