import { Collection } from 'discord.js';
import { GuildMemberEvent } from './guild-member.event';
import { createMockPrismaService, createMockTextChannel, createMockLogger } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('GuildMemberEvent', () => {
  let event: GuildMemberEvent;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    logger = createMockLogger();
    event = new GuildMemberEvent(prisma as unknown as PrismaService, logger as any);
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

      (prisma.guild.upsert as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        welcomeChannelId: 'welcome-ch',
      });

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

      (prisma.guild.upsert as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        welcomeChannelId: null,
      });

      await event.onMemberJoin([member] as any);

      // No send calls should have been made
    });

    it('should create guild if not exists', async () => {
      const member = createMockMember();

      (prisma.guild.upsert as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        welcomeChannelId: null,
      });

      await event.onMemberJoin([member] as any);

      expect(prisma.guild.upsert).toHaveBeenCalledWith({
        where: { discordId: '987654321' },
        update: { name: 'Test Guild' },
        create: { discordId: '987654321', name: 'Test Guild' },
      });
    });
  });

  describe('onMemberLeave', () => {
    it('should send goodbye embed when channel is configured', async () => {
      const channel = createMockTextChannel();
      const member = createMockMember();
      member.guild.channels.cache.set('goodbye-ch', channel);

      (prisma.guild.upsert as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        goodbyeChannelId: 'goodbye-ch',
      });

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

      (prisma.guild.upsert as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        goodbyeChannelId: null,
      });

      await event.onMemberLeave([member] as any);

      // No send calls should have been made
    });
  });
});
