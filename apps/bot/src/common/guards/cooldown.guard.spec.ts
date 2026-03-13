import { NecordExecutionContext } from 'necord';
import { CooldownGuard } from './cooldown.guard';
import {
  createMockInteraction,
  createMockExecutionContext,
  createMockReflector,
  mockNecordExecutionContext,
} from '@/test/mocks';

jest.mock('necord', () => ({
  NecordExecutionContext: {
    create: jest.fn(),
  },
}));

const createMockRedis = () => ({
  ttl: jest.fn().mockResolvedValue(-2),
  set: jest.fn().mockResolvedValue('OK'),
});

describe('CooldownGuard', () => {
  let guard: CooldownGuard;
  let reflector: ReturnType<typeof createMockReflector>;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    reflector = createMockReflector();
    redis = createMockRedis();
    guard = new CooldownGuard(reflector, redis as any);
  });

  afterEach(() => jest.restoreAllMocks());

  function setupContext(interaction: ReturnType<typeof createMockInteraction>) {
    const ctx = createMockExecutionContext();
    (NecordExecutionContext.create as jest.Mock).mockReturnValue(
      mockNecordExecutionContext(interaction)
    );
    return ctx;
  }

  it('should return true when no cooldown is configured', async () => {
    reflector.get.mockReturnValue(undefined);
    const interaction = createMockInteraction();
    const ctx = setupContext(interaction);

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should return true on first use (no existing key)', async () => {
    reflector.get.mockReturnValue({ duration: 5 });
    redis.ttl.mockResolvedValue(-2);
    const interaction = createMockInteraction({ commandName: 'ping' });
    const ctx = setupContext(interaction);

    expect(await guard.canActivate(ctx)).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('cooldown:ping:user:123456789', '1', 'EX', 5);
  });

  it('should return false with remaining time when on cooldown', async () => {
    reflector.get.mockReturnValue({ duration: 10 });
    redis.ttl.mockResolvedValue(7);
    const interaction = createMockInteraction({ commandName: 'test-cd' });
    const ctx = setupContext(interaction);

    expect(await guard.canActivate(ctx)).toBe(false);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringMatching(/Poczekaj.*7s/),
      })
    );
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('should return true after cooldown expires (ttl returns -2)', async () => {
    reflector.get.mockReturnValue({ duration: 1 });
    redis.ttl.mockResolvedValue(-2);
    const interaction = createMockInteraction({ commandName: 'test-expire' });
    const ctx = setupContext(interaction);

    expect(await guard.canActivate(ctx)).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('cooldown:test-expire:user:123456789', '1', 'EX', 1);
  });

  it('should return true when key exists but has no TTL (ttl returns -1)', async () => {
    reflector.get.mockReturnValue({ duration: 5 });
    redis.ttl.mockResolvedValue(-1);
    const interaction = createMockInteraction({ commandName: 'no-ttl' });
    const ctx = setupContext(interaction);

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should scope correctly by user', async () => {
    reflector.get.mockReturnValue({ duration: 10, scope: 'user' });

    const interaction1 = createMockInteraction({
      commandName: 'scoped',
      user: { id: 'user1', tag: 'User1#0001', username: 'User1' },
    });
    const interaction2 = createMockInteraction({
      commandName: 'scoped',
      user: { id: 'user2', tag: 'User2#0001', username: 'User2' },
    });

    // First user sets cooldown
    redis.ttl.mockResolvedValue(-2);
    const ctx1 = setupContext(interaction1);
    await guard.canActivate(ctx1);
    expect(redis.set).toHaveBeenCalledWith('cooldown:scoped:user:user1', '1', 'EX', 10);

    // Different user should not be blocked
    redis.ttl.mockResolvedValue(-2);
    const ctx2 = setupContext(interaction2);
    expect(await guard.canActivate(ctx2)).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('cooldown:scoped:user:user2', '1', 'EX', 10);
  });

  it('should scope correctly by guild', async () => {
    reflector.get.mockReturnValue({ duration: 10, scope: 'guild' });

    const interaction1 = createMockInteraction({
      commandName: 'guild-scoped',
      guildId: 'guild1',
    });
    const interaction2 = createMockInteraction({
      commandName: 'guild-scoped',
      guildId: 'guild2',
    });

    redis.ttl.mockResolvedValue(-2);
    const ctx1 = setupContext(interaction1);
    await guard.canActivate(ctx1);
    expect(redis.set).toHaveBeenCalledWith('cooldown:guild-scoped:guild:guild1', '1', 'EX', 10);

    // Different guild should not be blocked
    redis.ttl.mockResolvedValue(-2);
    const ctx2 = setupContext(interaction2);
    expect(await guard.canActivate(ctx2)).toBe(true);
  });

  it('should scope correctly by channel', async () => {
    reflector.get.mockReturnValue({ duration: 10, scope: 'channel' });

    const interaction1 = createMockInteraction({
      commandName: 'channel-scoped',
      channelId: 'channel1',
    });
    const interaction2 = createMockInteraction({
      commandName: 'channel-scoped',
      channelId: 'channel2',
    });

    redis.ttl.mockResolvedValue(-2);
    const ctx1 = setupContext(interaction1);
    await guard.canActivate(ctx1);
    expect(redis.set).toHaveBeenCalledWith(
      'cooldown:channel-scoped:channel:channel1',
      '1',
      'EX',
      10
    );

    // Different channel should not be blocked
    redis.ttl.mockResolvedValue(-2);
    const ctx2 = setupContext(interaction2);
    expect(await guard.canActivate(ctx2)).toBe(true);
  });
});
