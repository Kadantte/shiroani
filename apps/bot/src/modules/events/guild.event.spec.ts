import { GuildEvent } from './guild.event';
import { createMockLogger } from '@/test/mocks';
import { GuildService } from '@/modules/guild/guild.service';

describe('GuildEvent', () => {
  let event: GuildEvent;
  let guildService: jest.Mocked<Pick<GuildService, 'ensureGuild' | 'clearChannelConfig'>>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    guildService = {
      ensureGuild: jest.fn().mockResolvedValue({
        id: 'internal-1',
        discordId: '987654321',
        name: 'New Guild',
      }),
      clearChannelConfig: jest.fn().mockResolvedValue(undefined),
    };
    logger = createMockLogger();
    event = new GuildEvent(guildService as unknown as GuildService, logger as any);
  });

  describe('onGuildJoin', () => {
    it('should call guildService.ensureGuild on guildCreate', async () => {
      const guild = { id: '987654321', name: 'New Guild' };

      await event.onGuildJoin([guild] as any);

      expect(guildService.ensureGuild).toHaveBeenCalledWith('987654321', 'New Guild');
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ guildId: '987654321', guildName: 'New Guild' }),
        expect.stringContaining('Joined new guild')
      );
    });
  });

  describe('onGuildLeave', () => {
    it('should log and clear channel config on guildDelete', async () => {
      const guild = { id: '987654321', name: 'Left Guild' };

      await event.onGuildLeave([guild] as any);

      expect(guildService.clearChannelConfig).toHaveBeenCalledWith('987654321');
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ guildId: '987654321', guildName: 'Left Guild' }),
        expect.stringContaining('Left guild')
      );
    });
  });
});
