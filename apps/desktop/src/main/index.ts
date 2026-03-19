import { app, BrowserWindow, protocol } from 'electron';
import { NestFactory } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { CustomIoAdapter } from '../modules/shared/custom-io-adapter';
import { AppModule } from '../modules/app.module';
import { createMainWindow } from './window';
import { cleanupIpcHandlers } from './ipc/register';
import { logger, getLogPath, flushLogs } from './logger';
import { initializeAutoUpdater } from './updater';
import { initializeAdblock } from './adblock';
import { corsOriginCallback } from '../modules/shared/cors.config';
import { NestLoggerAdapter } from '../modules/shared/nest-logger';
import { LOCALHOST } from '@shiroani/shared';
import { setBackendPort } from './backend-port';
import { BrowserManager } from './browser/browser-manager';
import { registerBackgroundProtocol } from './ipc/background';
import { initializeNotificationService, cleanupNotificationService } from './notification-service';
import {
  initializeDiscordRpc,
  cleanupDiscordRpc,
  onWindowBlur,
  onWindowFocus,
} from './discord-rpc-service';
import { store } from './store';
import {
  createMascotOverlay,
  destroyMascotOverlay,
  setMainWindow,
  updateMascotVisibilityForWindowState,
  type MascotWindowState,
} from './mascot/overlay';
import {
  createContextMenuWindow,
  destroyContextMenu,
  setMainWindowRef,
} from './mascot/context-menu';
import { createTray, destroyTray } from './tray';
import { safeCleanup } from './cleanup-utils';

// Register custom protocol scheme for background images.
// Must be called before app.ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'shiroani-bg',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: false,
      stream: true,
    },
  },
]);

// Allow E2E tests to isolate userData by setting ELECTRON_USER_DATA_DIR.
// Must run before app.ready so electron-store and other userData consumers
// see the overridden path.
if (process.env.ELECTRON_USER_DATA_DIR) {
  app.setPath('userData', process.env.ELECTRON_USER_DATA_DIR);
}

export let mainWindow: BrowserWindow | null = null;
let nestApp: INestApplication | null = null;
let isShuttingDown = false;
let cleanupDone = false;
const browserManager = new BrowserManager();

function showMainWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

async function bootstrapNestApp(): Promise<void> {
  try {
    logger.info('Creating NestJS application...');
    nestApp = await NestFactory.create(AppModule, {
      logger: new NestLoggerAdapter(),
      bufferLogs: true,
    });
    nestApp.flushLogs();
    logger.info('NestJS application created');

    nestApp.useWebSocketAdapter(new CustomIoAdapter(nestApp));

    nestApp.enableCors({
      origin: corsOriginCallback,
      credentials: true,
    });

    logger.info('Starting to listen on dynamic port...');
    await nestApp.listen(0, LOCALHOST);
    const addr = nestApp.getHttpServer().address();
    if (!addr || typeof addr === 'string') {
      throw new Error(`Failed to get server port: address() returned ${JSON.stringify(addr)}`);
    }
    const port = addr.port;
    if (!port || port === 0) {
      throw new Error('OS assigned port 0 — server did not bind successfully');
    }
    setBackendPort(port);
    logger.info(`NestJS server running on port ${port}`);
    logger.info('Log file location:', getLogPath());
  } catch (error) {
    logger.error('Failed to bootstrap NestJS:', error);
    throw error;
  }
}

async function shutdownNestApp(): Promise<void> {
  if (nestApp) {
    logger.info('Shutting down NestJS...');
    await nestApp.close();
    nestApp = null;
    logger.info('NestJS shutdown complete');
  }
}

/** Set up services and event listeners that depend on the main window */
function setupWindowDependentServices(win: BrowserWindow): void {
  const getMascotWindowState = (): MascotWindowState => {
    if (win.isMinimized()) return 'minimized';
    if (win.isVisible()) return 'visible';
    return 'hidden';
  };

  const syncMascotVisibility = (): void => {
    updateMascotVisibilityForWindowState(getMascotWindowState());
  };

  initializeAutoUpdater(win, process.env.NODE_ENV === 'development');
  if (nestApp) {
    initializeNotificationService(win, nestApp);
  }

  // Set up mascot overlay with main window reference
  setMainWindow(win);

  // On macOS the red traffic-light button should hide the app instead of
  // destroying the main window. This keeps tray/mascot integrations stable.
  win.on('close', event => {
    if (process.platform === 'darwin' && !isShuttingDown) {
      event.preventDefault();
      win.hide();
    }
  });

  // Wire window state changes to mascot visibility mode
  win.on('minimize', syncMascotVisibility);
  win.on('restore', syncMascotVisibility);
  win.on('show', syncMascotVisibility);
  win.on('hide', syncMascotVisibility);
  win.on('enter-full-screen', syncMascotVisibility);
  win.on('leave-full-screen', syncMascotVisibility);

  // Discord RPC idle detection on window blur/focus
  win.on('blur', () => onWindowBlur());
  win.on('focus', () => onWindowFocus());
}

async function bootstrap(): Promise<void> {
  // Log security posture at startup
  const isPackaged = app.isPackaged;
  logger.info(`[security] App packaged: ${isPackaged}`);
  if (isPackaged) {
    logger.info(
      '[security] Electron fuses configured at build time (RunAsNode=off, NodeCLIInspect=off, NodeOptions=off)'
    );
  } else {
    logger.info('[security] Running in development mode -- fuses not applied (build-time only)');
  }

  // Register custom protocol for serving background images from userData
  registerBackgroundProtocol();

  await bootstrapNestApp();
  browserManager.init();
  mainWindow = await createMainWindow(browserManager);
  setMainWindow(mainWindow);

  // Initialize Discord Rich Presence (non-blocking, handles Discord not running)
  initializeDiscordRpc();

  // Initialize adblocker after window creation, then enable on browser session
  // only if user hasn't explicitly disabled it
  try {
    await initializeAdblock();
    logger.info('Adblocker initialized successfully');

    const browserSettings = store.get('browser-settings') as
      | { adblockEnabled?: boolean }
      | undefined;
    const shouldEnableAdblock = browserSettings?.adblockEnabled !== false;

    if (shouldEnableAdblock) {
      browserManager.enableAdblock();
      logger.info('Adblock enabled on browser session');
    } else {
      logger.info('Adblock disabled per user settings');
    }
  } catch (error) {
    logger.warn('Failed to initialize adblocker:', error);
  }

  // Create the pre-hidden context menu window for the mascot overlay
  try {
    setMainWindowRef(mainWindow);
    createContextMenuWindow();
  } catch (error) {
    logger.warn('Failed to create context menu window:', error);
  }

  // Create the mascot overlay (Windows only, non-blocking)
  try {
    createMascotOverlay();
  } catch (error) {
    logger.warn('Failed to create mascot overlay:', error);
  }

  // Set up window-dependent services and event listeners
  setupWindowDependentServices(mainWindow);

  // Create system tray icon
  try {
    createTray(mainWindow);
  } catch (error) {
    logger.warn('Failed to create system tray:', error);
  }
}

// Global error handling
process.on('uncaughtException', error => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection:', reason);
});

// Handle SIGINT/SIGTERM (e.g. Ctrl+C in dev) by triggering graceful shutdown
// so that before-quit fires and onModuleDestroy can save state.
// Guard against duplicate signals (concurrently sends SIGTERM after SIGINT).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (isShuttingDown) return;
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    app.quit();
  });
}

app
  .whenReady()
  .then(bootstrap)
  .catch(error => {
    logger.error('Failed to bootstrap application:', error);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  logger.info('App activated');
  if (mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow(mainWindow);
    return;
  }

  // Recreate the main window even if auxiliary mascot/menu windows still exist.
  cleanupIpcHandlers();
  mainWindow = await createMainWindow(browserManager);
  setMainWindowRef(mainWindow);
  setupWindowDependentServices(mainWindow);
  showMainWindow(mainWindow);
});

app.on('before-quit', event => {
  mainWindow = null;

  // Cleanup finished, let the quit proceed
  if (cleanupDone) return;

  // Keep preventing quit until cleanup finishes (handles duplicate signals)
  event.preventDefault();

  // Already started cleanup, just keep preventing
  if (isShuttingDown) return;

  isShuttingDown = true;

  (async () => {
    await safeCleanup('system tray', () => destroyTray(), logger);
    await safeCleanup('context menu', () => destroyContextMenu(), logger);
    await safeCleanup('mascot overlay', () => destroyMascotOverlay(), logger);
    await safeCleanup('discord rpc', () => cleanupDiscordRpc(), logger);
    await safeCleanup('notification service', () => cleanupNotificationService(), logger);
    await safeCleanup('log flush', () => flushLogs(), logger);
    if (nestApp) {
      await shutdownNestApp();
    }
  })().finally(() => {
    cleanupDone = true;
    app.quit();
  });
});
