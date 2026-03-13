import { Collection } from 'discord.js';
import { GuildMemberEvent } from './guild-member.event';
import { createMockTextChannel, createMockLogger } from '@/test/mocks';
import { GuildService } from '@/modules/guild/guild.service';

describe('GuildMemberEvent', () => {
  let event: GuildMemberEvent;
  let guildService: jest.Mocked<Pick<GuildService, 'ensureGuild'>>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    guildService = {
      ensureGuild: jest.fn(),
    };
    logger = createMockLogger();
    event = new GuildMemberEvent(guildService as unknown as GuildService, logger as any);
  });

  function createMockMember(overrides: Record<string, any> = {}) {
    const channelsCache = new Collection<string, any>();

    return {
      user: {
        username: 'NewUser',
        displayAvatarURL: jest.fn().mockReturnValue('https://cdn.example.com/avatar.png'),
      },
      guild: {
        id: '987654321',
        name: 'Test Guild',
        memberCount: 100,
        channels: { cache: channelsCache },
      },
      ...overrides,
    };
  }

  describe('onMemberJoin', () => {
    it('should send welcome embed when channel is configured', async () => {
      const channel = createMockTextChannel();
      const member = createMockMember();
      member.guild.channels.cache.set('welcome-ch', channel);

      guildService.ensureGuild.mockResolvedValue({
        id: 'internal-1',
        welcomeChannelId: 'welcome-ch',
      } as any);

      await event.onMemberJoin([member] as any);

      expect(channel.send).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining('NewUser'),
            }),
          }),
        ]),
      });
    });

    it('should do nothing when welcome channel is not configured', async () => {
      const member = createMockMember();

      guildService.ensureGuild.mockResolvedValue({
        id: 'internal-1',
        welcomeChannelId: null,
      } as any);

      await event.onMemberJoin([member] as any);

      // No send calls should have been made
    });

    it('should call guildService.ensureGuild with correct args', async () => {
      const member = createMockMember();

      guildService.ensureGuild.mockResolvedValue({
        id: 'internal-1',
        welcomeChannelId: null,
      } as any);

      await event.onMemberJoin([member] as any);

      expect(guildService.ensureGuild).toHaveBeenCalledWith('987654321', 'Test Guild');
    });
  });

  describe('onMemberLeave', () => {
    it('should send goodbye embed when channel is configured', async () => {
      const channel = createMockTextChannel();
      const member = createMockMember();
      member.guild.channels.cache.set('goodbye-ch', channel);

      guildService.ensureGuild.mockResolvedValue({
        id: 'internal-1',
        goodbyeChannelId: 'goodbye-ch',
      } as any);

      await event.onMemberLeave([member] as any);

      expect(channel.send).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining('NewUser'),
            }),
          }),
        ]),
      });
    });

    it('should do nothing when goodbye channel is not configured', async () => {
      const member = createMockMember();

      guildService.ensureGuild.mockResolvedValue({
        id: 'internal-1',
        goodbyeChannelId: null,
      } as any);

      await event.onMemberLeave([member] as any);

      // No send calls should have been made
    });
  });
});
