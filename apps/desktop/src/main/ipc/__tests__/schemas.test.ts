import {
  windowMinimizeSchema,
  windowIsMaximizedSchema,
  updaterSetChannelSchema,
  updaterGetChannelSchema,
  appGetPathSchema,
  appLogWriteSchema,
  overlaySetPositionSchema,
  overlaySetEnabledSchema,
  overlaySetVisibilityModeSchema,
  browserToggleAdblockSchema,
  storeGetSchema,
  storeSetSchema,
  fileWriteJsonSchema,
  backgroundRemoveSchema,
  notificationsRemoveSubscriptionSchema,
} from '../schemas';

describe('window schemas', () => {
  it('windowMinimizeSchema rejects non-empty tuple', () => {
    expect(windowMinimizeSchema.safeParse([]).success).toBe(true);
    expect(windowMinimizeSchema.safeParse(['extra']).success).toBe(false);
  });

  it('windowIsMaximizedSchema accepts only []', () => {
    expect(windowIsMaximizedSchema.safeParse([]).success).toBe(true);
    expect(windowIsMaximizedSchema.safeParse([1]).success).toBe(false);
  });
});

describe('updater schemas', () => {
  it('updaterSetChannelSchema accepts "stable" and "beta"', () => {
    expect(updaterSetChannelSchema.safeParse(['stable']).success).toBe(true);
    expect(updaterSetChannelSchema.safeParse(['beta']).success).toBe(true);
  });

  it('updaterSetChannelSchema rejects unknown channel', () => {
    expect(updaterSetChannelSchema.safeParse(['canary']).success).toBe(false);
    expect(updaterSetChannelSchema.safeParse([123]).success).toBe(false);
  });

  it('updaterGetChannelSchema accepts empty tuple', () => {
    expect(updaterGetChannelSchema.safeParse([]).success).toBe(true);
    expect(updaterGetChannelSchema.safeParse(['stable']).success).toBe(false);
  });
});

describe('app schemas', () => {
  it('appGetPathSchema requires a string arg', () => {
    expect(appGetPathSchema.safeParse(['userData']).success).toBe(true);
    expect(appGetPathSchema.safeParse([123]).success).toBe(false);
    expect(appGetPathSchema.safeParse([]).success).toBe(false);
  });

  it('appLogWriteSchema validates full payload shape', () => {
    expect(
      appLogWriteSchema.safeParse([{ level: 'info', context: 'Test', message: 'hello' }]).success
    ).toBe(true);
    expect(
      appLogWriteSchema.safeParse([
        { level: 'warn', context: 'Test', message: 'with data', data: { a: 1 } },
      ]).success
    ).toBe(true);
    expect(
      appLogWriteSchema.safeParse([{ level: 'unknown', context: 'Test', message: 'x' }]).success
    ).toBe(false);
    expect(
      appLogWriteSchema.safeParse([{ level: 'info', context: '', message: 'x' }]).success
    ).toBe(false);
  });
});

describe('overlay schemas', () => {
  it('overlaySetPositionSchema requires two finite numbers', () => {
    expect(overlaySetPositionSchema.safeParse([10, 20]).success).toBe(true);
    expect(overlaySetPositionSchema.safeParse([10]).success).toBe(false);
    expect(overlaySetPositionSchema.safeParse([Number.NaN, 10]).success).toBe(false);
    expect(overlaySetPositionSchema.safeParse([Number.POSITIVE_INFINITY, 10]).success).toBe(false);
  });

  it('overlaySetEnabledSchema requires a boolean', () => {
    expect(overlaySetEnabledSchema.safeParse([true]).success).toBe(true);
    expect(overlaySetEnabledSchema.safeParse([false]).success).toBe(true);
    expect(overlaySetEnabledSchema.safeParse(['true']).success).toBe(false);
  });

  it('overlaySetVisibilityModeSchema accepts known modes', () => {
    expect(overlaySetVisibilityModeSchema.safeParse(['always']).success).toBe(true);
    expect(overlaySetVisibilityModeSchema.safeParse(['tray-only']).success).toBe(true);
    expect(overlaySetVisibilityModeSchema.safeParse(['other']).success).toBe(false);
  });
});

describe('other domain schemas', () => {
  it('browserToggleAdblockSchema requires boolean', () => {
    expect(browserToggleAdblockSchema.safeParse([true]).success).toBe(true);
    expect(browserToggleAdblockSchema.safeParse([0]).success).toBe(false);
  });

  it('storeGetSchema rejects empty string key', () => {
    expect(storeGetSchema.safeParse(['preferences.theme']).success).toBe(true);
    expect(storeGetSchema.safeParse(['']).success).toBe(false);
  });

  it('storeSetSchema accepts key + arbitrary value', () => {
    expect(storeSetSchema.safeParse(['settings', { x: 1 }]).success).toBe(true);
    expect(storeSetSchema.safeParse(['settings']).success).toBe(false);
  });

  it('fileWriteJsonSchema requires (path, json)', () => {
    expect(fileWriteJsonSchema.safeParse(['/tmp/x.json', '{}']).success).toBe(true);
    expect(fileWriteJsonSchema.safeParse(['/tmp/x.json']).success).toBe(false);
  });

  it('backgroundRemoveSchema rejects empty string', () => {
    expect(backgroundRemoveSchema.safeParse(['bg.png']).success).toBe(true);
    expect(backgroundRemoveSchema.safeParse(['']).success).toBe(false);
  });

  it('notificationsRemoveSubscriptionSchema requires integer', () => {
    expect(notificationsRemoveSubscriptionSchema.safeParse([12345]).success).toBe(true);
    expect(notificationsRemoveSubscriptionSchema.safeParse([1.5]).success).toBe(false);
    expect(notificationsRemoveSubscriptionSchema.safeParse(['123']).success).toBe(false);
  });
});
