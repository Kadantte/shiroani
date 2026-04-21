import { getLogBuffer, type LogEntry } from '@shiroani/shared';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useDiaryStore } from '@/stores/useDiaryStore';

/**
 * Build a markdown-formatted diagnostics snapshot the user can paste when
 * reporting a bug. Structured so key fields sit at the top and recent log
 * lines are already fenced for chat/forum readability.
 */
export async function collectDiagnostics(): Promise<string> {
  const version = (await window.electronAPI?.app?.getVersion?.()) ?? 'unknown';
  const platform =
    typeof navigator !== 'undefined' && 'userAgentData' in navigator
      ? ((navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData
          ?.platform ?? navigator.platform)
      : typeof navigator !== 'undefined'
        ? navigator.platform
        : 'unknown';

  const appState = useAppStore.getState();
  const settings = useSettingsStore.getState();
  const browser = useBrowserStore.getState();
  const library = useLibraryStore.getState();
  const diary = useDiaryStore.getState();

  const recent = getLogBuffer().slice(-50);
  const logBlock = recent.length
    ? recent.map(formatLogLine).join('\n')
    : '(no entries in ring buffer)';

  return [
    '## ShiroAni diagnostics',
    '',
    `- **App version**: ${version}`,
    `- **Platform**: ${platform}`,
    `- **User agent**: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    `- **Theme**: ${settings.theme}`,
    `- **Active view**: ${appState.activeView}`,
    `- **Tabs open**: ${browser.tabs.length}`,
    `- **Adblock**: ${browser.adblockEnabled ? 'on' : 'off'} (${browser.adblockWhitelist.length} whitelisted)`,
    `- **Library entries**: ${library.entries.length}`,
    `- **Diary entries**: ${diary.entries.length}`,
    `- **Captured at**: ${new Date().toISOString()}`,
    '',
    '### Recent logs (last 50)',
    '',
    '```',
    logBlock,
    '```',
  ].join('\n');
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
