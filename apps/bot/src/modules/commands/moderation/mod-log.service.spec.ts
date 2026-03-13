import { Collection } from 'discord.js';
import { ModLogService, ModLogEntry } from './mod-log.service';
import {
  createMockClient,
  createMockPrismaService,
  createMockTextChannel,
  createMockLogger,
  createMockUser,
} from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('ModLogService', () => {
  let service: ModLogService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let client: ReturnType<typeof createMockClient>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    client = createMockClient();
    logger = createMockLogger();

    service = new ModLogService(prisma as unknown as PrismaService, client as any, logger as any);
  });

  const baseEntry: ModLogEntry = {
    guildId: '987654321',
    action: 'BAN' as any,
    targetUserId: '555',
    moderatorId: '123456789',
    reason: 'Spam',
  };

  it('should create moderation log in database', async () => {
    (prisma.guild.findUnique as jest.Mock).mockResolvedValue({
      id: 'internal-1',
      discordId: '987654321',
      modLogChannelId: null,
    });
    (prisma.moderationLog.create as jest.Mock).mockResolvedValue({
      id: 'log-1',
      ...baseEntry,
    });

    await service.log(baseEntry);

    expect(prisma.moderationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guildId: 'internal-1',
        action: 'BAN',
        targetUserId: '555',
        moderatorId: '123456789',
        reason: 'Spam',
      }),
    });
  });

  it('should resolve discord guild ID to internal ID', async () => {
    (prisma.guild.findUnique as jest.Mock).mockResolvedValue({
      id: 'internal-42',
      discordId: '987654321',
      modLogChannelId: null,
    });
    (prisma.moderationLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' });

    await service.log(baseEntry);

    expect(prisma.guild.findUnique).toHaveBeenCalledWith({
      where: { discordId: '987654321' },
    });
    expect(prisma.moderationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guildId: 'internal-42',
      }),
    });
  });

  it('should post to mod log channel when configured', async () => {
    const modLogChannel = createMockTextChannel({ id: 'modlog-ch' });

    const channelsCache = new Collection<string, any>();
    channelsCache.set('modlog-ch', modLogChannel);

    const discordGuild = { id: '987654321', channels: { cache: channelsCache } };
    (client as any).guilds.cache = new Collection<string, any>();
    (client as any).guilds.cache.set('987654321', discordGuild);

    const targetUser = createMockUser({ id: '555', tag: 'Target#0001' });
    const modUser = createMockUser({ id: '123456789', tag: 'Mod#0001' });
    (client.users.fetch as jest.Mock)
      .mockResolvedValueOnce(targetUser)
      .mockResolvedValueOnce(modUser);

    (prisma.guild.findUnique as jest.Mock).mockResolvedValue({
      id: 'internal-1',
      discordId: '987654321',
      modLogChannelId: 'modlog-ch',
    });
    (prisma.moderationLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' });

    await service.log(baseEntry);

    expect(modLogChannel.send).toHaveBeenCalledWith({
      embeds: expect.any(Array),
    });
  });

  it('should handle missing guild gracefully', async () => {
    (prisma.guild.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.log(baseEntry);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ guildId: '987654321' }),
      expect.stringContaining('Guild not found')
    );
    expect(prisma.moderationLog.create).not.toHaveBeenCalled();
  });

  it('should handle missing mod log channel gracefully', async () => {
    (prisma.guild.findUnique as jest.Mock).mockResolvedValue({
      id: 'internal-1',
      discordId: '987654321',
      modLogChannelId: null,
    });
    (prisma.moderationLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' });

    // Should not throw
    const result = await service.log(baseEntry);

    expect(result).toEqual({ id: 'log-1' });
    // No channel.send should be called
  });
});
