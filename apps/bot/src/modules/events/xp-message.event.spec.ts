import { Collection } from 'discord.js';
import { XpMessageEvent } from './xp-message.event';
import { createMockLogger, createMockTextChannel } from '@/test/mocks';
import { GuildService } from '@/modules/guild/guild.service';
import { XpService } from '@/modules/leveling/xp.service';
import { LevelRoleService } from '@/modules/leveling/level-role.service';

describe('XpMessageEvent', () => {
  let event: XpMessageEvent;
  let guildService: jest.Mocked<Pick<GuildService, 'findByDiscordId'>>;
  let xpService: jest.Mocked<
    Pick<XpService, 'isOnCooldown' | 'setCooldown' | 'awardXp' | 'randomXpAmount'>
  >;
  let levelRoleService: jest.Mocked<Pick<LevelRoleService, 'getRolesForLevel'>>;
  let logger: ReturnType<typeof createMockLogger>;

  const guildConfig = {
    id: 'internal-1',
    discordId: '987654321',
    name: 'Test Guild',
    xpEnabled: true,
    xpCooldown: 60,
    xpMinAmount: 15,
    xpMaxAmount: 25,
    levelUpChannelId: 'lu-channel-1',
  };

  beforeEach(() => {
    guildService = {
      findByDiscordId: jest.fn().mockResolvedValue(guildConfig),
    };
    xpService = {
      isOnCooldown: jest.fn().mockResolvedValue(false),
      setCooldown: jest.fn().mockResolvedValue(undefined),
      awardXp: jest.fn().mockResolvedValue({
        member: { xp: 20, level: 1, messages: 1 },
        leveledUp: false,
        newLevel: 0,
        oldLevel: 0,
      }),
      randomXpAmount: jest.fn().mockReturnValue(20),
    };
    levelRoleService = {
      getRolesForLevel: jest.fn().mockResolvedValue([]),
    };
    logger = createMockLogger();
    event = new XpMessageEvent(
      guildService as unknown as GuildService,
      xpService as unknown as XpService,
      levelRoleService as unknown as LevelRoleService,
      logger as any
    );
  });

  function createMessage(overrides: Record<string, unknown> = {}) {
    return {
      author: { id: '123456789', bot: false },
      guild: {
        id: '987654321',
        members: {
          fetch: jest.fn().mockResolvedValue({
            roles: {
              cache: new Collection(),
              add: jest.fn().mockResolvedValue(undefined),
            },
          }),
        },
        channels: {
          cache: new Collection(),
        },
      },
      content: 'Hello world',
      ...overrides,
    };
  }

  describe('onMessage', () => {
    it('should award XP on valid message', async () => {
      const message = createMessage();

      await event.onMessage([message] as any);

      expect(guildService.findByDiscordId).toHaveBeenCalledWith('987654321');
      expect(xpService.isOnCooldown).toHaveBeenCalledWith('987654321', '123456789');
      expect(xpService.setCooldown).toHaveBeenCalledWith('987654321', '123456789', 60);
      expect(xpService.randomXpAmount).toHaveBeenCalledWith(15, 25);
      expect(xpService.awardXp).toHaveBeenCalledWith('internal-1', '987654321', '123456789', 20);
    });

    it('should skip bot messages', async () => {
      const message = createMessage({ author: { id: '123', bot: true } });

      await event.onMessage([message] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should skip DMs (no guild)', async () => {
      const message = createMessage({ guild: null });

      await event.onMessage([message] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should skip empty messages', async () => {
      const message = createMessage({ content: '' });

      await event.onMessage([message] as any);

      expect(guildService.findByDiscordId).not.toHaveBeenCalled();
    });

    it('should skip when XP is not enabled for guild', async () => {
      guildService.findByDiscordId.mockResolvedValue({ ...guildConfig, xpEnabled: false } as any);
      const message = createMessage();

      await event.onMessage([message] as any);

      expect(xpService.isOnCooldown).not.toHaveBeenCalled();
    });

    it('should skip when guild is not found', async () => {
      guildService.findByDiscordId.mockResolvedValue(null);
      const message = createMessage();

      await event.onMessage([message] as any);

      expect(xpService.isOnCooldown).not.toHaveBeenCalled();
    });

    it('should skip when user is on cooldown', async () => {
      xpService.isOnCooldown.mockResolvedValue(true);
      const message = createMessage();

      await event.onMessage([message] as any);

      expect(xpService.setCooldown).not.toHaveBeenCalled();
      expect(xpService.awardXp).not.toHaveBeenCalled();
    });

    it('should set cooldown after passing cooldown check', async () => {
      const message = createMessage();

      await event.onMessage([message] as any);

      expect(xpService.setCooldown).toHaveBeenCalledWith('987654321', '123456789', 60);
    });
  });

  describe('level-up', () => {
    beforeEach(() => {
      xpService.awardXp.mockResolvedValue({
        member: { xp: 200, level: 1, messages: 10 },
        leveledUp: true,
        newLevel: 1,
        oldLevel: 0,
      });
    });

    it('should apply level roles on level-up', async () => {
      const roleAdd = jest.fn().mockResolvedValue(undefined);
      const rolesCache = new Collection<string, unknown>();
      const message = createMessage({
        guild: {
          id: '987654321',
          members: {
            fetch: jest.fn().mockResolvedValue({
              roles: { cache: rolesCache, add: roleAdd },
            }),
          },
          channels: { cache: new Collection() },
        },
      });
      levelRoleService.getRolesForLevel.mockResolvedValue([
        { id: 'lr-1', guildId: 'internal-1', level: 1, roleId: 'role-100' },
      ] as any);

      await event.onMessage([message] as any);

      expect(levelRoleService.getRolesForLevel).toHaveBeenCalledWith('internal-1', 1);
      expect(roleAdd).toHaveBeenCalledWith('role-100');
    });

    it('should not re-add roles the member already has', async () => {
      const roleAdd = jest.fn().mockResolvedValue(undefined);
      const rolesCache = new Collection<string, unknown>();
      rolesCache.set('role-100', { id: 'role-100' });
      const message = createMessage({
        guild: {
          id: '987654321',
          members: {
            fetch: jest.fn().mockResolvedValue({
              roles: { cache: rolesCache, add: roleAdd },
            }),
          },
          channels: { cache: new Collection() },
        },
      });
      levelRoleService.getRolesForLevel.mockResolvedValue([
        { id: 'lr-1', guildId: 'internal-1', level: 1, roleId: 'role-100' },
      ] as any);

      await event.onMessage([message] as any);

      expect(roleAdd).not.toHaveBeenCalled();
    });

    it('should send level-up message to configured channel', async () => {
      const sendFn = jest.fn().mockResolvedValue(undefined);
      const channelsCache = new Collection<string, unknown>();
      const textChannel = createMockTextChannel({ id: 'lu-channel-1', send: sendFn });
      channelsCache.set('lu-channel-1', textChannel);

      const message = createMessage({
        guild: {
          id: '987654321',
          members: {
            fetch: jest
              .fn()
              .mockResolvedValue({ roles: { cache: new Collection(), add: jest.fn() } }),
          },
          channels: { cache: channelsCache },
        },
      });

      await event.onMessage([message] as any);

      expect(sendFn).toHaveBeenCalledWith({
        content: expect.stringContaining('poziom 1'),
      });
    });

    it('should not send level-up message when no channel configured', async () => {
      guildService.findByDiscordId.mockResolvedValue({
        ...guildConfig,
        levelUpChannelId: null,
      } as any);
      const message = createMessage();

      await event.onMessage([message] as any);

      // No channel send should happen -- no error either
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle missing level-up channel gracefully', async () => {
      // Channel ID is set but the channel does not exist in cache
      const channelsCache = new Collection<string, unknown>();
      const message = createMessage({
        guild: {
          id: '987654321',
          members: {
            fetch: jest
              .fn()
              .mockResolvedValue({ roles: { cache: new Collection(), add: jest.fn() } }),
          },
          channels: { cache: channelsCache },
        },
      });

      await event.onMessage([message] as any);

      // Should not throw, no error logged for missing channel
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle member fetch failure in role assignment gracefully', async () => {
      const message = createMessage({
        guild: {
          id: '987654321',
          members: { fetch: jest.fn().mockRejectedValue(new Error('Unknown Member')) },
          channels: { cache: new Collection() },
        },
      });
      levelRoleService.getRolesForLevel.mockResolvedValue([
        { id: 'lr-1', guildId: 'internal-1', level: 1, roleId: 'role-100' },
      ] as any);

      await event.onMessage([message] as any);

      // Should not throw
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log warning when role add fails', async () => {
      const roleAdd = jest.fn().mockRejectedValue(new Error('Missing Permissions'));
      const message = createMessage({
        guild: {
          id: '987654321',
          members: {
            fetch: jest.fn().mockResolvedValue({
              roles: { cache: new Collection(), add: roleAdd },
            }),
          },
          channels: { cache: new Collection() },
        },
      });
      levelRoleService.getRolesForLevel.mockResolvedValue([
        { id: 'lr-1', guildId: 'internal-1', level: 1, roleId: 'role-100' },
      ] as any);

      await event.onMessage([message] as any);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'role-100', userId: '123456789' }),
        expect.stringContaining('Failed to add level role')
      );
    });
  });
});
