import type { AiringAnime, NotificationSettings } from '@shiroani/shared';

/**
 * Port for persisting notification state. The Electron host implements this
 * using electron-store; tests can swap in an in-memory adapter.
 */
export abstract class NotificationStorePort {
  abstract loadSettings(): Partial<NotificationSettings> | undefined;
  abstract saveSettings(settings: NotificationSettings): void;

  abstract loadSentKeys(): string[];
  abstract saveSentKeys(keys: string[]): void;

  abstract loadCachedSchedule(): AiringAnime[];
  abstract saveCachedSchedule(schedule: AiringAnime[]): void;
}
