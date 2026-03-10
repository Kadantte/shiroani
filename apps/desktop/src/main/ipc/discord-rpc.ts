import { ipcMain } from 'electron';
import { createLogger } from '@shiroani/shared';
import type { DiscordRpcSettings, DiscordPresenceActivity } from '@shiroani/shared';
import {
  getDiscordRpcSettings,
  updateDiscordRpcSettings,
  updateDiscordPresence,
  clearDiscordPresence,
} from '../discord-rpc-service';

const logger = createLogger('IPC:DiscordRpc');

/**
 * Register Discord RPC IPC handlers
 */
export function registerDiscordRpcHandlers(): void {
  ipcMain.handle('discord-rpc:get-settings', () => {
    return getDiscordRpcSettings();
  });

  ipcMain.handle('discord-rpc:update-settings', (_event, updates: Partial<DiscordRpcSettings>) => {
    try {
      return updateDiscordRpcSettings(updates);
    } catch (error) {
      logger.error('Failed to update Discord RPC settings:', error);
      throw error;
    }
  });

  ipcMain.handle('discord-rpc:update-presence', (_event, activity: DiscordPresenceActivity) => {
    try {
      updateDiscordPresence(activity);
    } catch (error) {
      logger.error('Failed to update Discord presence:', error);
    }
  });

  ipcMain.handle('discord-rpc:clear-presence', () => {
    try {
      clearDiscordPresence();
    } catch (error) {
      logger.error('Failed to clear Discord presence:', error);
    }
  });
}

/**
 * Clean up Discord RPC IPC handlers
 */
export function cleanupDiscordRpcHandlers(): void {
  ipcMain.removeHandler('discord-rpc:get-settings');
  ipcMain.removeHandler('discord-rpc:update-settings');
  ipcMain.removeHandler('discord-rpc:update-presence');
  ipcMain.removeHandler('discord-rpc:clear-presence');
}
