import { getLogBuffer, redactForLogs, type LogEntry } from '@shiroani/shared';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useDiaryStore } from '@/stores/useDiaryStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

/**
 * Best-effort redaction wrapper for a plain string (paths, etc.) before it
 * lands in a user-visible diagnostics snapshot. Falls through to the raw
 * value on any failure so diagnostics never throw end-to-end.
 */
function redactString(value: string | undefined | null): string {
  if (value == null) return 'unknown';
  try {
    return redactForLogs(value);
  } catch {
    return value;
  }
}

/**
 * Build a markdown-formatted diagnostics snapshot the user can paste when
 * reporting a bug. Structured so key fields sit at the top and recent log
 * lines are already fenced for chat/forum readability.
 */
export async function collectDiagnostics(): Promise<string> {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;

  const appVersion = (await api?.app?.getVersion?.()) ?? 'unknown';

  // Attempt the richer system-info IPC. Older main processes that lack the
  // handler return undefined (or reject) — fall back to what we can gather
  // in the renderer alone.
  type SystemInfoPayload = {
    appVersion: string;
    electronVersion: string;
    chromeVersion: string;
    nodeVersion: string;
    osPlatform: string;
    osRelease: string;
    arch: string;
    userDataPath: string;
    logsPath: string;
    gpuFeatureStatus: unknown;
  };
  let systemInfo: SystemInfoPayload | null = null;
  try {
    const result = await api?.app?.getSystemInfo?.();
    if (result) systemInfo = result as SystemInfoPayload;
  } catch {
    systemInfo = null;
  }

  const platform =
    typeof navigator !== 'undefined' && 'userAgentData' in navigator
      ? ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData
          ?.platform ?? navigator.platform)
      : typeof navigator !== 'undefined'
        ? navigator.platform
        : 'unknown';

  const locale =
    typeof navigator !== 'undefined' && typeof navigator.language === 'string'
      ? navigator.language
      : 'unknown';

  const appState = useAppStore.getState();
  const settings = useSettingsStore.getState();
  const browser = useBrowserStore.getState();
  const library = useLibraryStore.getState();
  const diary = useDiaryStore.getState();
  const notifications = useNotificationStore.getState();

  // Notifications master toggle (separate from per-anime subscriptions).
  let notificationsEnabled: boolean | null;
  try {
    const notifSettings = await api?.notifications?.getSettings?.();
    notificationsEnabled =
      notifSettings && typeof notifSettings.enabled === 'boolean' ? notifSettings.enabled : null;
  } catch {
    notificationsEnabled = null;
  }

  // Discord RPC toggle.
  let discordRpcEnabled: boolean | null;
  try {
    const rpcSettings = await api?.discordRpc?.getSettings?.();
    discordRpcEnabled =
      rpcSettings && typeof rpcSettings.enabled === 'boolean' ? rpcSettings.enabled : null;
  } catch {
    discordRpcEnabled = null;
  }

  const notificationPermission =
    typeof Notification !== 'undefined' && typeof Notification.permission === 'string'
      ? Notification.permission
      : 'unknown';

  const recent = getLogBuffer().slice(-50);
  const rendererLogBlock = recent.length
    ? recent.map(formatLogLine).join('\n')
    : '(no entries in ring buffer)';

  const mainLogBlock = await readMainLogTail(50);

  const sections: string[] = [
    '## ShiroAni diagnostics',
    '',
    `- **App version**: ${appVersion}`,
    `- **Platform**: ${platform}`,
    `- **Locale**: ${locale}`,
    `- **Notifications permission**: ${notificationPermission}`,
    `- **User agent**: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    `- **Theme**: ${settings.theme}`,
    `- **Active view**: ${appState.activeView}`,
    `- **Tabs open**: ${browser.tabs.length}`,
    `- **Library entries**: ${library.entries.length}`,
    `- **Diary entries**: ${diary.entries.length}`,
    `- **Captured at**: ${new Date().toISOString()}`,
  ];

  if (systemInfo) {
    sections.push(
      '',
      '### System',
      '',
      `- **Electron**: ${systemInfo.electronVersion}`,
      `- **Chrome**: ${systemInfo.chromeVersion}`,
      `- **Node**: ${systemInfo.nodeVersion}`,
      `- **OS**: ${systemInfo.osPlatform} ${systemInfo.osRelease}`,
      `- **Arch**: ${systemInfo.arch}`,
      '',
      '### Ścieżki',
      '',
      `- **userData**: ${redactString(systemInfo.userDataPath)}`,
      `- **logs**: ${redactString(systemInfo.logsPath)}`,
      '',
      '### GPU',
      '',
      '```json',
      safeJsonStringify(systemInfo.gpuFeatureStatus),
      '```'
    );
  }

  sections.push(
    '',
    '### Funkcje',
    '',
    `- **Tryb deweloperski**: ${settings.devModeEnabled ? 'on' : 'off'}`,
    `- **Adblock**: ${browser.adblockEnabled ? 'on' : 'off'} (${browser.adblockWhitelist.length} whitelist)`,
    `- **Blokada popupów**: ${browser.popupBlockEnabled ? 'on' : 'off'}`,
    `- **Przywracanie kart**: ${browser.restoreTabsOnStartup ? 'on' : 'off'}`,
    `- **Discord RPC**: ${formatTriState(discordRpcEnabled)}`,
    `- **Powiadomienia (master)**: ${formatTriState(notificationsEnabled)}`,
    `- **Subskrypcje harmonogramu**: ${notifications.subscriptions.length}`
  );

  sections.push(
    '',
    '### Ostatnie logi (renderer)',
    '',
    '```',
    rendererLogBlock,
    '```',
    '',
    '### Ostatnie logi (main)',
    '',
    '```',
    mainLogBlock,
    '```'
  );

  return sections.join('\n');
}

function formatLogLine(entry: LogEntry): string {
  const time = entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const base = `${time} ${level} [${entry.context}] ${entry.message}`;
  return entry.data !== undefined ? `${base} ${formatData(entry.data)}` : base;
}

function formatData(data: unknown): string {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTriState(value: boolean | null): string {
  if (value === null) return 'unknown';
  return value ? 'on' : 'off';
}

/**
 * Read the tail of the most recent main-process log file via the exposed IPC.
 * Returns a placeholder string when the IPC is unavailable or no file exists.
 */
async function readMainLogTail(maxLines: number): Promise<string> {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const listLogFiles = api?.app?.listLogFiles;
  const readLogFile = api?.app?.readLogFile;
  if (!listLogFiles || !readLogFile) {
    return '(main log unavailable — IPC not exposed)';
  }

  try {
    const files = await listLogFiles();
    if (!Array.isArray(files) || files.length === 0) {
      return '(no main log files)';
    }
    // listLogFiles returns newest first (sorted by lastModified desc in main).
    const newest = files[0];
    if (!newest || typeof newest.name !== 'string') {
      return '(no main log files)';
    }

    const contents = await readLogFile(newest.name);
    if (typeof contents !== 'string' || contents.length === 0) {
      return '(main log empty)';
    }

    const lines = contents.split(/\r?\n/);
    // Drop a trailing empty line produced by a final newline.
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    const tail = lines.slice(-maxLines).join('\n');
    return tail.length > 0 ? tail : '(main log empty)';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `(main log read failed: ${redactString(message)})`;
  }
}

/**
 * Collect + copy diagnostics to the clipboard. Returns `true` on success.
 */
export async function copyDiagnosticsToClipboard(): Promise<boolean> {
  const text = await collectDiagnostics();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to electron clipboard
  }
  try {
    await window.electronAPI?.app?.clipboardWrite?.(text);
    return true;
  } catch {
    return false;
  }
}
