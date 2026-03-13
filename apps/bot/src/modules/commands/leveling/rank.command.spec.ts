import { MessageFlags } from 'discord.js';
import { RankCommand } from './rank.command';
import { XpService } from '@/modules/leveling/xp.service';
import { GuildService } from '@/modules/guild/guild.service';
import { createMockInteraction, createMockUser } from '@/test/mocks';

describe('RankCommand', () => {
  let command: RankCommand;
  let xpService: jest.Mocked<
    Pick<XpService, 'getMember' | 'getRank' | 'levelFromXp' | 'xpForLevel' | 'totalXpForLevel'>
  >;
  let guildService: jest.Mocked<Pick<GuildService, 'findByDiscordId'>>;

  const mockGuild = { id: 'internal-id-1', discordId: '987654321', name: 'Test Guild' };

  beforeEach(() => {
    xpService = {
      getMember: jest.fn(),
      getRank: jest.fn(),
      levelFromXp: jest.fn(),
      xpForLevel: jest.fn(),
      totalXpForLevel: jest.fn(),
    };
    guildService = {
      findByDiscordId: jest.fn().mockResolvedValue(mockGuild),
    };
    command = new RankCommand(
      xpService as unknown as XpService,
      guildService as unknown as GuildService
    );
  });

  it('should show own rank when no user specified', async () => {
    const interaction = createMockInteraction();
    xpService.getMember.mockResolvedValue({
      xp: 350,
      level: 2,
      messages: 42,
    } as any);
    xpService.levelFromXp.mockReturnValue(2);
    xpService.totalXpForLevel.mockReturnValue(255); // cumulative XP to reach level 2
    xpService.xpForLevel.mockReturnValue(210); // XP needed for level 2 -> 3
    xpService.getRank.mockResolvedValue(3);

    await command.onRank([interaction] as any, {});

    expect(guildService.findByDiscordId).toHaveBeenCalledWith(interaction.guildId);
    expect(xpService.getMember).toHaveBeenCalledWith(mockGuild.id, interaction.user.id);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: 'Poziom 2',
            }),
          }),
        ]),
      })
    );
  });

  it("should show another user's rank", async () => {
    const interaction = createMockInteraction();
    const targetUser = createMockUser({ id: '555', username: 'OtherUser' });
    xpService.getMember.mockResolvedValue({
      xp: 500,
      level: 3,
      messages: 100,
    } as any);
    xpService.levelFromXp.mockReturnValue(3);
    xpService.totalXpForLevel.mockReturnValue(465);
    xpService.xpForLevel.mockReturnValue(295);
    xpService.getRank.mockResolvedValue(1);

    await command.onRank([interaction] as any, { user: targetUser });

    expect(xpService.getMember).toHaveBeenCalledWith(mockGuild.id, '555');
    expect(xpService.getRank).toHaveBeenCalledWith(interaction.guildId, '555');
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: 'Poziom 3',
            }),
          }),
        ]),
      })
    );
  });

  it('should handle user with no XP data', async () => {
    const interaction = createMockInteraction();
    xpService.getMember.mockResolvedValue(null);

    await command.onRank([interaction] as any, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should display correct progress bar', async () => {
    const interaction = createMockInteraction();
    xpService.getMember.mockResolvedValue({
      xp: 150,
      level: 1,
      messages: 10,
    } as any);
    xpService.levelFromXp.mockReturnValue(1);
    xpService.totalXpForLevel.mockReturnValue(100); // cumulative to reach level 1
    xpService.xpForLevel.mockReturnValue(155); // XP needed for level 1 -> 2
    xpService.getRank.mockResolvedValue(5);

    await command.onRank([interaction] as any, {});

    // currentLevelXp = 150 - 100 = 50, xpForNextLevel = 155
    // filled = Math.round((50/155) * 10) = Math.round(3.22) = 3
    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    const xpField = embed.data.fields[0];
    expect(xpField.value).toContain('50/155');
    expect(xpField.value).toContain('\u2588'.repeat(3));
    expect(xpField.value).toContain('\u2591'.repeat(7));
  });
});
