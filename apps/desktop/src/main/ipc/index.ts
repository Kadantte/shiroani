// Types
export type { MessageDialogOptions } from './types';

// Window handlers
export { registerWindowHandlers, cleanupWindowHandlers } from './window';

// Dialog handlers
export { registerDialogHandlers, cleanupDialogHandlers } from './dialog';

// Store handlers
export { registerStoreHandlers, cleanupStoreHandlers } from './store';

// App handlers
export { registerAppHandlers, cleanupAppHandlers } from './app';

// Updater handlers
export { registerUpdaterHandlers, cleanupUpdaterHandlers } from './updater';

// Browser handlers
export { registerBrowserHandlers, cleanupBrowserHandlers } from './browser';

// Background handlers
export {
  registerBackgroundHandlers,
  cleanupBackgroundHandlers,
  registerBackgroundProtocol,
} from './background';

// Notification handlers
export { registerNotificationHandlers, cleanupNotificationHandlers } from './notifications';
