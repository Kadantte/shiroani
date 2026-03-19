import { BrowserWindow, safeStorage, shell } from 'electron';
import crypto from 'crypto';
import http from 'http';
import { createLogger } from '@shiroani/shared';
import type { AuthState, DiscordUser } from '@shiroani/shared';
import { store } from './store';

const logger = createLogger('AuthService');

const STORE_KEY = 'discord-auth';
const LOGIN_TIMEOUT_MS = 120_000;
const DISCORD_CLIENT_ID = '1481042476402872361';
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_SCOPES = 'identify';

let targetWindow: BrowserWindow | null = null;
let loopbackServer: http.Server | null = null;
let loginTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

// ========================================
// Token storage helpers (encrypted)
// ========================================

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: DiscordUser;
}

function saveTokens(tokens: StoredTokens): void {
  const json = JSON.stringify(tokens);
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json);
    store.set(STORE_KEY, encrypted.toString('base64'));
  } else {
    // Fallback: store as plain JSON (dev environments without keychain)
    store.set(STORE_KEY, json);
  }
}

function loadTokens(): StoredTokens | null {
  const stored = store.get(STORE_KEY) as string | undefined;
  if (!stored) return null;

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(stored, 'base64');
      const decrypted = safeStorage.decryptString(buffer);
      return JSON.parse(decrypted) as StoredTokens;
    }
    // Fallback: parse as plain JSON
    return JSON.parse(stored) as StoredTokens;
  } catch (error) {
    logger.error('Failed to load stored tokens:', error);
    store.delete(STORE_KEY);
    return null;
  }
}

function clearTokens(): void {
  store.delete(STORE_KEY);
}

// ========================================
// Discord API helpers
// ========================================

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  port: number
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `http://127.0.0.1:${port}/callback`,
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    username: data.username,
    discriminator: data.discriminator,
    globalName: data.global_name ?? null,
    avatar: data.avatar ?? null,
  };
}

async function refreshTokensFromDiscord(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

// ========================================
// Loopback server helpers
// ========================================

function cleanupLoopbackServer(): void {
  if (loopbackServer) {
    try {
      loopbackServer.close();
    } catch {
      // ignore
    }
    loopbackServer = null;
  }
}

function clearLoginTimeout(): void {
  if (loginTimeoutTimer) {
    clearTimeout(loginTimeoutTimer);
    loginTimeoutTimer = null;
  }
}

function notifyRenderer(channel: string, data?: unknown): void {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send(channel, data);
  }
}

// ========================================
// PKCE helpers
// ========================================

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// ========================================
// Success HTML page
// ========================================

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShiroAni - Login Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: #eee; }
    .container { text-align: center; }
    h1 { color: #a78bfa; }
    p { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login Successful</h1>
    <p>You can close this tab and return to ShiroAni.</p>
  </div>
</body>
</html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShiroAni - Login Failed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: #eee; }
    .container { text-align: center; }
    h1 { color: #ef4444; }
    p { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Login Failed</h1>
    <p>Something went wrong. Please try again from ShiroAni.</p>
  </div>
</body>
</html>`;

// ========================================
// Public API
// ========================================

export function initializeAuthService(mainWindow: BrowserWindow): void {
  targetWindow = mainWindow;

  const tokens = loadTokens();
  if (tokens) {
    const now = Date.now();
    const timeUntilExpiry = tokens.expiresAt - now;

    if (timeUntilExpiry <= 0) {
      // Token expired — try to refresh
      logger.info('Stored token expired, attempting refresh');
      refreshAccessToken().catch(error => {
        logger.error('Failed to refresh expired token on init:', error);
      });
    } else if (timeUntilExpiry < 5 * 60 * 1000) {
      // Expires within 5 minutes — refresh proactively
      logger.info('Token near expiry, scheduling refresh');
      setTimeout(() => {
        refreshAccessToken().catch(error => {
          logger.error('Failed to refresh near-expiry token:', error);
        });
      }, 1000);
    } else {
      logger.info('AuthService initialized with valid stored auth');
    }
  } else {
    logger.info('AuthService initialized (no stored auth)');
  }
}

export function cleanupAuthService(): void {
  cleanupLoopbackServer();
  clearLoginTimeout();
  targetWindow = null;
  logger.info('AuthService cleaned up');
}

export function getAuthState(): AuthState {
  const tokens = loadTokens();
  if (!tokens) {
    return { isAuthenticated: false, user: null, expiresAt: null };
  }

  const now = Date.now();
  if (tokens.expiresAt <= now) {
    return { isAuthenticated: false, user: tokens.user, expiresAt: tokens.expiresAt };
  }

  return {
    isAuthenticated: true,
    user: tokens.user,
    expiresAt: tokens.expiresAt,
  };
}

export async function startDiscordLogin(): Promise<void> {
  // Clean up any existing login attempt
  cleanupLoopbackServer();
  clearLoginTimeout();

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  return new Promise<void>((resolve, reject) => {
    loopbackServer = http.createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1`);
      const returnedState = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        logger.error('Discord OAuth error:', error);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        notifyRenderer('auth:login-error', error);
        cleanupLoopbackServer();
        clearLoginTimeout();
        reject(new Error(`Discord OAuth error: ${error}`));
        return;
      }

      if (returnedState !== state) {
        logger.error('OAuth state mismatch');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        notifyRenderer('auth:login-error', 'State mismatch — possible CSRF attack');
        cleanupLoopbackServer();
        clearLoginTimeout();
        reject(new Error('OAuth state mismatch'));
        return;
      }

      if (!code) {
        logger.error('No authorization code received');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        notifyRenderer('auth:login-error', 'No authorization code received');
        cleanupLoopbackServer();
        clearLoginTimeout();
        reject(new Error('No authorization code'));
        return;
      }

      try {
        const addr = loopbackServer?.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const tokenResponse = await exchangeCodeForTokens(code, codeVerifier, port);
        const user = await fetchDiscordUser(tokenResponse.access_token);

        const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
        saveTokens({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt,
          user,
        });

        logger.info(`Discord login successful: ${user.username}`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(SUCCESS_HTML);
        notifyRenderer('auth:login-success', user);
        cleanupLoopbackServer();
        clearLoginTimeout();
        resolve();
      } catch (exchangeError) {
        logger.error('Token exchange failed:', exchangeError);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        const message =
          exchangeError instanceof Error ? exchangeError.message : 'Token exchange failed';
        notifyRenderer('auth:login-error', message);
        cleanupLoopbackServer();
        clearLoginTimeout();
        reject(exchangeError);
      }
    });

    loopbackServer.listen(0, '127.0.0.1', () => {
      const addr = loopbackServer?.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;

      const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: `http://127.0.0.1:${port}/callback`,
        response_type: 'code',
        scope: DISCORD_SCOPES,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
      logger.info(`Opening Discord OAuth (port ${port})`);
      shell.openExternal(authUrl);
    });

    loopbackServer.on('error', error => {
      logger.error('Loopback server error:', error);
      notifyRenderer('auth:login-error', 'Failed to start local server');
      cleanupLoopbackServer();
      clearLoginTimeout();
      reject(error);
    });

    // Timeout after LOGIN_TIMEOUT_MS
    loginTimeoutTimer = setTimeout(() => {
      loginTimeoutTimer = null;
      logger.warn('Login timed out');
      notifyRenderer('auth:login-error', 'Login timed out');
      cleanupLoopbackServer();
      reject(new Error('Login timed out'));
    }, LOGIN_TIMEOUT_MS);
  });
}

export function logout(): void {
  clearTokens();
  logger.info('User logged out');
  notifyRenderer('auth:login-success', null);
}

export async function refreshAccessToken(): Promise<AuthState> {
  const tokens = loadTokens();
  if (!tokens) {
    return { isAuthenticated: false, user: null, expiresAt: null };
  }

  try {
    const tokenResponse = await refreshTokensFromDiscord(tokens.refreshToken);
    const user = await fetchDiscordUser(tokenResponse.access_token);

    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    saveTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      user,
    });

    logger.info('Token refreshed successfully');

    return {
      isAuthenticated: true,
      user,
      expiresAt,
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    clearTokens();
    return { isAuthenticated: false, user: null, expiresAt: null };
  }
}
