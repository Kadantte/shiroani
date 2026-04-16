import { app, BrowserWindow, Menu, shell, session } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc/register';
import { VITE_DEV_PORT } from '@shiroani/shared';
import { logger } from './logger';
import { getBackendPort } from './backend-port';
import { BrowserManager } from './browser/browser-manager';

/**
 * Set Content Security Policy for the renderer process
 * This helps prevent XSS attacks and other injection vulnerabilities
 */
function setupContentSecurityPolicy(isDev: boolean, backendPort: number): void {
  // Only apply CSP to the main renderer's own pages, not to webview content
  const urlFilter = isDev
    ? { urls: [`http://localhost:${VITE_DEV_PORT}/*`] }
    : { urls: ['file://*'] };

  session.defaultSession.webRequest.onHeadersReceived(urlFilter, (details, callback) => {
    // Build CSP directives
    const cspDirectives = [
      // Only allow scripts from same origin (and Vite dev server in dev mode)
      isDev
        ? `script-src 'self' http://localhost:${VITE_DEV_PORT} 'unsafe-inline' 'unsafe-eval'`
        : "script-src 'self'",
      // Allow styles from same origin and inline (needed for CSS-in-JS)
      "style-src 'self' 'unsafe-inline'",
      // Allow images from any HTTPS source (favicons, anime covers, user-browsed sites)
      "img-src 'self' data: blob: shiroani-bg: shiroani-poster: https: http:",
      // Allow fonts from same origin
      "font-src 'self' data:",
      // Allow connections to localhost (WebSocket and API) and AniList GraphQL.
      // The wildcard 127.0.0.1/localhost ports cover the Nest WebSocket server
      // (dynamic port) and the local player HTTP server started by
      // `PlayerService` (different dynamic port) -- JASSUB fetches extracted
      // ASS + font attachments from there.
      isDev
        ? `connect-src 'self' http://localhost:${VITE_DEV_PORT} ws://localhost:${VITE_DEV_PORT} http://localhost:${backendPort} ws://localhost:${backendPort} http://127.0.0.1:${backendPort} ws://127.0.0.1:${backendPort} http://127.0.0.1:* http://localhost:* https://graphql.anilist.co`
        : `connect-src 'self' http://localhost:${backendPort} ws://localhost:${backendPort} http://127.0.0.1:${backendPort} ws://127.0.0.1:${backendPort} http://127.0.0.1:* http://localhost:* https://graphql.anilist.co`,
      // Restrict object/embed sources
      "object-src 'none'",
      // Allow frames from same origin only (webview tags use their own session)
      "frame-src 'self' https:",
      // Allow media from HTTPS sources for video/audio playback + the local
      // player HTTP server (Phase 4 local-library playback).
      "media-src 'self' https: blob: http://127.0.0.1:* http://localhost:*",
      // Default to same-origin
      "default-src 'self'",
      // Allow forms to submit to same origin
      "form-action 'self'",
      // Restrict base URI
      "base-uri 'self'",
    ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives.join('; ')],
      },
    });
  });
}

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);

export function isExternalUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export async function createMainWindow(browserManager: BrowserManager): Promise<BrowserWindow> {
  const isDev = process.env.NODE_ENV === 'development';

  // Set up Content Security Policy before creating the window
  setupContentSecurityPolicy(isDev, getBackendPort());

  // Allow the small set of permissions the desktop shell actually uses.
  // `fullscreen` is required by the local-library player.
  const allowedPermissions = new Set(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen']);

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (allowedPermissions.has(permission)) {
      callback(true);
      return;
    }
    logger.warn(`[security] Denied permission request: ${permission}`);
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (allowedPermissions.has(permission)) {
      return true;
    }
    logger.debug(`[security] Denied permission check: ${permission}`);
    return false;
  });

  // Remove Electron's default application menu to prevent its built-in
  // Ctrl+W (close window) accelerator from intercepting our browser tab close shortcut.
  // On macOS, keep a minimal menu so standard shortcuts (Cmd+Q, Cmd+C/V) still work.
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
          ],
        },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'ShiroAni',
    backgroundColor: '#0a0a0f',
    icon: app.isPackaged
      ? path.join(process.resourcesPath, `icon.${process.platform === 'win32' ? 'ico' : 'png'}`)
      : path.join(
          __dirname,
          `../../resources/icon.${process.platform === 'win32' ? 'ico' : 'png'}`
        ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true, // Enable <webview> tag for built-in browser
    },
  });

  // Security: validate and harden <webview> tags before they attach
  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences, _params) => {
    // Force safe defaults — never trust renderer-supplied values
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.contextIsolation = true;
    webPreferences.allowRunningInsecureContent = true; // needed for anime sites with mixed content

    // Strip any preload scripts the renderer might inject
    delete webPreferences.preload;
    delete (webPreferences as Record<string, unknown>).preloadURL;

    // Do NOT force sandbox — macOS sandboxed renderers block cross-origin iframes

    logger.debug('[security] will-attach-webview: webPreferences hardened');
  });

  // Register all IPC handlers
  registerIpcHandlers(mainWindow, browserManager);

  // Block all new window creation, open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrlAllowed(url)) {
      logger.info(`[security] Blocked new window creation, opening in browser: ${url}`);
      shell.openExternal(url);
    } else {
      logger.warn(`[security] Blocked opening URL with disallowed protocol: ${url}`);
    }
    return { action: 'deny' };
  });

  // Safety net: if a window is somehow created, log it
  mainWindow.webContents.on('did-create-window', window => {
    logger.warn('[security] Unexpected window created -- closing immediately');
    window.close();
  });

  // Block external URL navigation in renderer, open in system browser instead
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = isDev ? [`http://localhost:${VITE_DEV_PORT}`] : ['file://'];
    const isAllowed = allowedOrigins.some(origin => url.startsWith(origin));
    if (!isAllowed) {
      event.preventDefault();
      if (isExternalUrlAllowed(url)) {
        logger.info(`[security] Blocked navigation to external URL, opening in browser: ${url}`);
        shell.openExternal(url);
      } else {
        logger.warn(`[security] Blocked navigation to URL with disallowed protocol: ${url}`);
      }
    }
  });

  if (isDev) {
    logger.info('Running in development mode - loading from Vite dev server');
    mainWindow.webContents.openDevTools();

    // Load from Vite dev server
    mainWindow.loadURL(`http://localhost:${VITE_DEV_PORT}`).catch(err => {
      logger.error('Failed to load from Vite dev server:', err.message);
      logger.error('Make sure the web app is running: pnpm dev:web (in another terminal)');
    });
  } else {
    // Production: load from built files
    const indexPath = path.join(__dirname, '../renderer/index.html');
    logger.info('Running in production mode - loading from:', indexPath);

    mainWindow.loadFile(indexPath).catch(err => {
      logger.error('Failed to load renderer:', err);
    });

    // Log renderer errors
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      logger.error('Renderer failed to load:', errorCode, errorDescription);
    });
  }

  return mainWindow;
}
