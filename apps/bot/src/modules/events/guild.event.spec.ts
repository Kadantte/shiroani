import { GuildEvent } from './guild.event';
import { createMockPrismaService, createMockLogger } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('GuildEvent', () => {
  let event: GuildEvent;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    logger = createMockLogger();
    event = new GuildEvent(prisma as unknown as PrismaService, logger as any);
  });

  describe('onGuildJoin', () => {
    it('should create or update guild on guildCreate', async () => {
      const guild = { id: '987654321', name: 'New Guild' };
      (prisma.guild.upsert as jest.Mock).mockResolvedValue({
        id: 'internal-1',
        discordId: '987654321',
        name: 'New Guild',
      });

      await event.onGuildJoin([guild] as any);

      expect(prisma.guild.upsert).toHaveBeenCalledWith({
        where: { discordId: '987654321' },
        update: { name: 'New Guild' },
        create: { discordId: '987654321', name: 'New Guild' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ guildId: '987654321', guildName: 'New Guild' }),
        expect.stringContaining('Joined new guild')
      );
    });
  });

  describe('onGuildLeave', () => {
    it('should log on guildDelete', async () => {
      const guild = { id: '987654321', name: 'Left Guild' };

      await event.onGuildLeave([guild] as any);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ guildId: '987654321', guildName: 'Left Guild' }),
        expect.stringContaining('Left guild')
      );
    });
  });
});
