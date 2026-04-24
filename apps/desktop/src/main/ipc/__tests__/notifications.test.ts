jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockService = {
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
  getSubscriptions: jest.fn(),
  addSubscription: jest.fn(),
  removeSubscription: jest.fn(),
  toggleSubscription: jest.fn(),
  isSubscribed: jest.fn(),
};
jest.mock('../../notifications/notification-service', () => mockService);

import { ipcMain } from 'electron';
import { registerNotificationHandlers, cleanupNotificationHandlers } from '../notifications';

describe('registerNotificationHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    Object.values(mockService).forEach(fn => (fn as jest.Mock).mockReset());
  });

  it('notifications:get-settings delegates to service', async () => {
    mockService.getNotificationSettings.mockReturnValue({ enabled: true });
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:get-settings');
    expect(mockService.getNotificationSettings).toHaveBeenCalled();
    expect(result).toEqual({ enabled: true });
  });

  it('notifications:update-settings delegates with payload', async () => {
    const updates = { enabled: false };
    mockService.updateNotificationSettings.mockReturnValue(updates);
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:update-settings', updates);
    expect(mockService.updateNotificationSettings).toHaveBeenCalledWith(updates);
    expect(result).toEqual(updates);
  });

  it('notifications:get-subscriptions delegates', async () => {
    mockService.getSubscriptions.mockReturnValue([]);
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:get-subscriptions');
    expect(mockService.getSubscriptions).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('notifications:get-subscriptions returns [] on service error (fallback)', async () => {
    mockService.getSubscriptions.mockImplementation(() => {
      throw new Error('boom');
    });
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:get-subscriptions');
    expect(result).toEqual([]);
  });

  it('notifications:add-subscription delegates', async () => {
    const sub = {
      anilistId: 1,
      title: 'Test',
      subscribedAt: '2026-01-01T00:00:00Z',
      enabled: true,
      source: 'schedule' as const,
    };
    mockService.addSubscription.mockReturnValue([sub]);
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:add-subscription', sub);
    expect(mockService.addSubscription).toHaveBeenCalledWith(sub);
    expect(result).toEqual([sub]);
  });

  it('notifications:remove-subscription delegates with id', async () => {
    mockService.removeSubscription.mockReturnValue([]);
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('notifications:remove-subscription', 42);
    expect(mockService.removeSubscription).toHaveBeenCalledWith(42);
  });

  it('notifications:toggle-subscription delegates with id', async () => {
    mockService.toggleSubscription.mockReturnValue([]);
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('notifications:toggle-subscription', 99);
    expect(mockService.toggleSubscription).toHaveBeenCalledWith(99);
  });

  it('notifications:is-subscribed delegates', async () => {
    mockService.isSubscribed.mockReturnValue(true);
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:is-subscribed', 10);
    expect(result).toBe(true);
  });

  it('notifications:is-subscribed returns false on error (fallback)', async () => {
    mockService.isSubscribed.mockImplementation(() => {
      throw new Error('bad');
    });
    registerNotificationHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('notifications:is-subscribed', 10);
    expect(result).toBe(false);
  });

  describe('cleanupNotificationHandlers', () => {
    it('removes all notification handlers', () => {
      registerNotificationHandlers();
      cleanupNotificationHandlers();
      [
        'notifications:get-settings',
        'notifications:update-settings',
        'notifications:get-subscriptions',
        'notifications:add-subscription',
        'notifications:remove-subscription',
        'notifications:toggle-subscription',
        'notifications:is-subscribed',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
