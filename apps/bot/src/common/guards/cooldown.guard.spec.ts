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

describe('CooldownGuard', () => {
  let guard: CooldownGuard;
  let reflector: ReturnType<typeof createMockReflector>;

  beforeEach(() => {
    reflector = createMockReflector();
    guard = new CooldownGuard(reflector);
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // prevent cleanup
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

  it('should return true on first use', async () => {
    reflector.get.mockReturnValue({ duration: 5 });
    const interaction = createMockInteraction({ commandName: 'ping' });
    const ctx = setupContext(interaction);

    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should return false with remaining time when on cooldown', async () => {
    reflector.get.mockReturnValue({ duration: 10 });
    const interaction = createMockInteraction({ commandName: 'test-cd' });

    // First call sets cooldown
    const ctx1 = setupContext(interaction);
    await guard.canActivate(ctx1);

    // Second call should be blocked
    const ctx2 = setupContext(interaction);
    expect(await guard.canActivate(ctx2)).toBe(false);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringMatching(/Poczekaj.*\d+s/),
      })
    );
  });

  it('should return true after cooldown expires', async () => {
    reflector.get.mockReturnValue({ duration: 1 });
    const interaction = createMockInteraction({ commandName: 'test-expire' });

    const ctx1 = setupContext(interaction);
    await guard.canActivate(ctx1);

    // Manually expire the cooldown by manipulating the internal map
    const cooldowns = (guard as any).cooldowns as Map<string, number>;
    for (const [key] of cooldowns) {
      cooldowns.set(key, Date.now() - 1000);
    }

    const ctx2 = setupContext(interaction);
    expect(await guard.canActivate(ctx2)).toBe(true);
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

    const ctx1 = setupContext(interaction1);
    await guard.canActivate(ctx1);

    // Different user should not be blocked
    const ctx2 = setupContext(interaction2);
    expect(await guard.canActivate(ctx2)).toBe(true);
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

    const ctx1 = setupContext(interaction1);
    await guard.canActivate(ctx1);

    // Different guild should not be blocked
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

    const ctx1 = setupContext(interaction1);
    await guard.canActivate(ctx1);

    // Different channel should not be blocked
    const ctx2 = setupContext(interaction2);
    expect(await guard.canActivate(ctx2)).toBe(true);
  });
});
