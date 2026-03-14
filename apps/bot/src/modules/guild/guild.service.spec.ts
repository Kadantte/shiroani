import { GuildService } from './guild.service';
import { createMockPrismaService, createMockLogger } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('GuildService', () => {
  let service: GuildService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    logger = createMockLogger();
    service = new GuildService(prisma as unknown as PrismaService, logger as any);
  });

  describe('ensureGuild', () => {
    it('should upsert a guild record', async () => {
      const expected = { id: 'internal-1', discordId: '123', name: 'My Guild' };
      (prisma.guild.upsert as jest.Mock).mockResolvedValue(expected);

      const result = await service.ensureGuild('123', 'My Guild');

      expect(prisma.guild.upsert).toHaveBeenCalledWith({
        where: { discordId: '123' },
        update: { name: 'My Guild' },
        create: { discordId: '123', name: 'My Guild' },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findByDiscordId', () => {
    it('should find a guild by Discord ID', async () => {
      const expected = { id: 'internal-1', discordId: '123', name: 'My Guild' };
      (prisma.guild.findUnique as jest.Mock).mockResolvedValue(expected);

      const result = await service.findByDiscordId('123');

      expect(prisma.guild.findUnique).toHaveBeenCalledWith({
        where: { discordId: '123' },
      });
      expect(result).toEqual(expected);
    });

    it('should return null when guild does not exist', async () => {
      (prisma.guild.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByDiscordId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateSetting', () => {
    it('should update a single guild setting field', async () => {
      (prisma.guild.update as jest.Mock).mockResolvedValue({});

      await service.updateSetting('123', 'welcomeChannelId', 'ch-new');

      expect(prisma.guild.update).toHaveBeenCalledWith({
        where: { discordId: '123' },
        data: { welcomeChannelId: 'ch-new' },
      });
    });

    it('should set a field to null', async () => {
      (prisma.guild.update as jest.Mock).mockResolvedValue({});

      await service.updateSetting('123', 'modLogChannelId', null);

      expect(prisma.guild.update).toHaveBeenCalledWith({
        where: { discordId: '123' },
        data: { modLogChannelId: null },
      });
    });
  });

  describe('clearChannelConfig', () => {
    it('should clear all channel IDs for an existing guild', async () => {
      (prisma.guild.findUnique as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        discordId: '123',
        welcomeChannelId: 'ch-1',
        goodbyeChannelId: 'ch-2',
        modLogChannelId: 'ch-3',
        activityChannelId: 'ch-4',
      });
      (prisma.guild.update as jest.Mock).mockResolvedValue({});

      await service.clearChannelConfig('123');

      expect(prisma.guild.update).toHaveBeenCalledWith({
        where: { discordId: '123' },
        data: {
          welcomeChannelId: null,
          goodbyeChannelId: null,
          modLogChannelId: null,
          activityChannelId: null,
          verifyChannelId: null,
          verifyRoleId: null,
          verifyMessageId: null,
          levelUpChannelId: null,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        { discordId: '123' },
        'Cleared channel configuration for departed guild'
      );
    });

    it('should do nothing when guild does not exist', async () => {
      (prisma.guild.findUnique as jest.Mock).mockResolvedValue(null);

      await service.clearChannelConfig('nonexistent');

      expect(prisma.guild.update).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
