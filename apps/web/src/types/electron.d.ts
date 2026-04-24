import type { ElectronAPI } from '@shiroani/shared';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __testStores?: Record<string, unknown>;
    __testSocket?: unknown;
  }
}

export {};
