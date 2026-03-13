import { ipcRenderer } from 'electron';

/**
 * IPC invoke with timeout.
 * Races ipcRenderer.invoke against a timer so the renderer never hangs
 * if the main process fails to respond.
 *
 * @throws {Error} When the timeout is exceeded
 */
export function invokeWithTimeout<T>(
  channel: string,
  timeout: number,
  ...args: unknown[]
): Promise<T> {
  const invokePromise = ipcRenderer.invoke(channel, ...args) as Promise<T>;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`IPC timeout: "${channel}" did not respond within ${timeout}ms`));
    }, timeout);
    // Allow Node to exit even if the timer is still pending
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }
  });

  return Promise.race([invokePromise, timeoutPromise]);
}

/**
 * Cancellable IPC invoke.
 * Returns a handle with `promise` and `cancel()`. Calling `cancel()` rejects
 * the promise with a cancellation error and ignores any later response.
 */
export function cancellableInvoke<T>(
  channel: string,
  ...args: unknown[]
): { promise: Promise<T>; cancel: () => void } {
  let cancelled = false;
  let rejectFn: ((reason: Error) => void) | null = null;

  const promise = new Promise<T>((resolve, reject) => {
    rejectFn = reject;

    ipcRenderer
      .invoke(channel, ...args)
      .then((result: T) => {
        if (!cancelled) resolve(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) reject(error);
      });
  });

  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    rejectFn?.(new Error(`IPC request cancelled: "${channel}"`));
  };

  return { promise, cancel };
}
