import { LeaderboardCommand } from './leaderboard.command';
import { XpService } from '@/modules/leveling/xp.service';
import { createMockInteraction } from '@/test/mocks';

describe('LeaderboardCommand', () => {
  let command: LeaderboardCommand;
  let xpService: jest.Mocked<
    Pick<XpService, 'getLeaderboard' | 'getLeaderboardSize' | 'levelFromXp'>
  >;

  beforeEach(() => {
    xpService = {
      getLeaderboard: jest.fn(),
      getLeaderboardSize: jest.fn(),
      levelFromXp: jest.fn(),
    };
    command = new LeaderboardCommand(xpService as unknown as XpService);
  });

  it('should show leaderboard page 1', async () => {
    const interaction = createMockInteraction();
    (interaction.client as any).users = {
      fetch: jest.fn().mockResolvedValue({ username: 'User1' }),
    };
    xpService.getLeaderboardSize.mockResolvedValue(3);
    xpService.getLeaderboard.mockResolvedValue([
      { userId: '1', xp: 500 },
      { userId: '2', xp: 300 },
      { userId: '3', xp: 100 },
    ]);
    xpService.levelFromXp.mockReturnValue(2);

    await command.onLeaderboard([interaction] as any, {});

    expect(xpService.getLeaderboard).toHaveBeenCalledWith(interaction.guildId, 1, 10);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining('Ranking XP'),
            }),
          }),
        ]),
      })
    );
  });

  it('should handle empty leaderboard', async () => {
    const interaction = createMockInteraction();
    xpService.getLeaderboardSize.mockResolvedValue(0);

    await command.onLeaderboard([interaction] as any, {});

    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    expect(embed.data.description).toContain('Ranking jest pusty');
  });

  it('should paginate correctly', async () => {
    const interaction = createMockInteraction();
    (interaction.client as any).users = {
      fetch: jest.fn().mockResolvedValue({ username: 'User' }),
    };
    xpService.getLeaderboardSize.mockResolvedValue(25);
    xpService.getLeaderboard.mockResolvedValue([
      { userId: '11', xp: 100 },
      { userId: '12', xp: 90 },
    ]);
    xpService.levelFromXp.mockReturnValue(1);

    await command.onLeaderboard([interaction] as any, { page: 2 });

    expect(xpService.getLeaderboard).toHaveBeenCalledWith(interaction.guildId, 2, 10);

    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    expect(embed.data.footer.text).toBe('Strona 2/3');

    // Should have both prev and next buttons
    expect(replyCall.components).toHaveLength(1);
    const buttons = replyCall.components[0].components;
    expect(buttons).toHaveLength(2);
  });
});
