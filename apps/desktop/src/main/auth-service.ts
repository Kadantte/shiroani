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
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>ShiroAni - Zalogowano</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #0f0e12; color: #eee;
      overflow: hidden;
    }
    .bg-orb {
      position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; opacity: 0.4;
    }
    .orb-1 {
      width: 300px; height: 300px; top: -80px; right: -60px;
      background: radial-gradient(circle, rgba(180,120,200,0.3), transparent 70%);
      animation: drift 25s ease-in-out infinite;
    }
    .orb-2 {
      width: 250px; height: 250px; bottom: -60px; left: -40px;
      background: radial-gradient(circle, rgba(200,160,100,0.2), transparent 70%);
      animation: drift 30s ease-in-out infinite reverse;
    }
    @keyframes drift {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(20px, -30px) scale(1.05); }
      66% { transform: translate(-15px, 15px) scale(0.97); }
    }
    .container {
      position: relative; text-align: center; z-index: 1;
      animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .check-ring {
      width: 80px; height: 80px; margin: 0 auto 24px;
      border-radius: 50%; position: relative;
      background: rgba(180,140,220,0.08);
      box-shadow: 0 0 40px rgba(180,140,220,0.15), 0 0 80px rgba(180,140,220,0.05);
      animation: bounce-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .check-ring::after {
      content: '';
      position: absolute; top: 50%; left: 50%;
      width: 28px; height: 16px;
      border-left: 3px solid #c8a0e8; border-bottom: 3px solid #c8a0e8;
      transform: translate(-50%, -60%) rotate(-45deg);
      animation: check-draw 0.4s ease-out 0.5s both;
    }
    @keyframes check-draw {
      0% { clip-path: inset(0 100% 0 0); opacity: 0; }
      100% { clip-path: inset(0 0 0 0); opacity: 1; }
    }
    @keyframes bounce-in {
      0% { opacity: 0; transform: scale(0) translateY(20px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes fade-up {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      50% { opacity: 0.8; transform: scale(1); }
    }
    .sparkle {
      position: absolute; border-radius: 50%;
      background: rgba(200,160,230,0.7);
      pointer-events: none;
    }
    h1 {
      font-family: 'Sora', system-ui, sans-serif;
      font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;
      background: linear-gradient(135deg, #d4a0f0, #a070c8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p { color: #7a7588; font-size: 0.875rem; line-height: 1.5; }
    .brand {
      margin-top: 32px; opacity: 0;
      animation: fade-up 0.6s ease-out 0.6s both;
    }
    .brand-jp { font-size: 1.125rem; font-weight: 700; color: #e8e0f0; }
    .brand-en {
      font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.25em;
      color: rgba(200,180,220,0.35); font-weight: 500;
    }
    .float { animation: float 3s ease-in-out infinite; }
  </style>
</head>
<body>
  <div class="bg-orb orb-1"></div>
  <div class="bg-orb orb-2"></div>
  <div class="container">
    <div class="float">
      <div class="check-ring" id="checkRing"></div>
    </div>
    <h1>Zalogowano pomyślnie!</h1>
    <p>Możesz zamknąć tę kartę i wrócić do ShiroAni.</p>
    <div class="brand">
      <div class="brand-jp">白アニ</div>
      <div class="brand-en">ShiroAni</div>
    </div>
  </div>
  <script>
    // Sparkles around the check ring
    const ring = document.getElementById('checkRing');
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const r = 50 + Math.random() * 30;
      const size = 2 + Math.random() * 3;
      Object.assign(s.style, {
        width: size + 'px', height: size + 'px',
        left: 'calc(50% + ' + (Math.cos(angle) * r) + 'px)',
        top: 'calc(50% + ' + (Math.sin(angle) * r) + 'px)',
        animation: 'twinkle ' + (1.5 + Math.random() * 1.5) + 's ease-in-out ' + (Math.random() * 2) + 's infinite',
      });
      ring.appendChild(s);
    }
  </script>
</body>
</html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>ShiroAni - Błąd logowania</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #0f0e12; color: #eee;
      overflow: hidden;
    }
    .bg-orb {
      position: fixed; width: 250px; height: 250px; border-radius: 50%;
      filter: blur(80px); pointer-events: none; opacity: 0.3;
      top: -60px; right: -40px;
      background: radial-gradient(circle, rgba(220,100,100,0.25), transparent 70%);
      animation: drift 25s ease-in-out infinite;
    }
    @keyframes drift {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-20px, 20px); }
    }
    @keyframes fade-up {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }
    .container {
      position: relative; text-align: center; z-index: 1;
      animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .error-ring {
      width: 80px; height: 80px; margin: 0 auto 24px;
      border-radius: 50%; position: relative;
      background: rgba(220,100,100,0.08);
      box-shadow: 0 0 40px rgba(220,100,100,0.1);
      animation: shake 0.5s ease-out 0.3s both;
    }
    .error-ring::before, .error-ring::after {
      content: ''; position: absolute;
      top: 50%; left: 50%; width: 3px; height: 24px;
      background: #e07070; border-radius: 2px;
    }
    .error-ring::before { transform: translate(-50%, -50%) rotate(45deg); }
    .error-ring::after { transform: translate(-50%, -50%) rotate(-45deg); }
    h1 {
      font-family: 'Sora', system-ui, sans-serif;
      font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;
      color: #e07070;
    }
    p { color: #7a7588; font-size: 0.875rem; line-height: 1.5; }
    .brand {
      margin-top: 32px; opacity: 0;
      animation: fade-up 0.6s ease-out 0.6s both;
    }
    .brand-jp { font-size: 1.125rem; font-weight: 700; color: #e8e0f0; }
    .brand-en {
      font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.25em;
      color: rgba(200,180,220,0.35); font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="bg-orb"></div>
  <div class="container">
    <div class="error-ring"></div>
    <h1>Coś poszło nie tak</h1>
    <p>Spróbuj ponownie z poziomu ShiroAni.</p>
    <div class="brand">
      <div class="brand-jp">白アニ</div>
      <div class="brand-en">ShiroAni</div>
    </div>
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
