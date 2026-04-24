import type { ElectronAPI } from '@shiroani/shared';
import { invokeWithTimeout, cancellableInvoke } from './_shared';

export const ipcApi: ElectronAPI['ipc'] = {
  invokeWithTimeout: <T>(channel: string, timeout: number, ...args: unknown[]) =>
    invokeWithTimeout<T>(channel, timeout, ...args),
  cancellableInvoke: <T>(channel: string, ...args: unknown[]) =>
    cancellableInvoke<T>(channel, ...args),
};
