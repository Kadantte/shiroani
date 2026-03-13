import { MessageFlags } from 'discord.js';
import { SetupLevelsCommand } from './setup-levels.command';
import { GuildService } from '@/modules/guild/guild.service';
import { LevelRoleService } from '@/modules/leveling/level-role.service';
import { createMockInteraction, createMockTextChannel } from '@/test/mocks';

describe('SetupLevelsCommand', () => {
  let command: SetupLevelsCommand;
  let guildService: jest.Mocked<
    Pick<GuildService, 'ensureGuild' | 'updateSetting' | 'updateXpEnabled' | 'findByDiscordId'>
  >;
  let levelRoleService: jest.Mocked<
    Pick<LevelRoleService, 'addLevelRole' | 'removeLevelRole' | 'getLevelRoles'>
  >;

  const mockGuild = { id: 'internal-id-1', discordId: '987654321', name: 'Test Guild' };

  beforeEach(() => {
    guildService = {
      ensureGuild: jest.fn().mockResolvedValue(mockGuild),
      updateSetting: jest.fn().mockResolvedValue(undefined),
      updateXpEnabled: jest.fn().mockResolvedValue(undefined),
      findByDiscordId: jest.fn().mockResolvedValue(mockGuild),
    };
    levelRoleService = {
      addLevelRole: jest.fn().mockResolvedValue(undefined),
      removeLevelRole: jest.fn().mockResolvedValue(undefined),
      getLevelRoles: jest.fn().mockResolvedValue([]),
    };
    command = new SetupLevelsCommand(
      guildService as unknown as GuildService,
      levelRoleService as unknown as LevelRoleService
    );
  });

  it('should enable XP system', async () => {
    const interaction = createMockInteraction();

    await command.onSetupLevels([interaction] as any, { enable: true });

    expect(guildService.ensureGuild).toHaveBeenCalledWith(
      interaction.guildId,
      interaction.guild!.name
    );
    expect(guildService.updateXpEnabled).toHaveBeenCalledWith(interaction.guildId, true);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should disable XP system', async () => {
    const interaction = createMockInteraction();

    await command.onSetupLevels([interaction] as any, { enable: false });

    expect(guildService.updateXpEnabled).toHaveBeenCalledWith(interaction.guildId, false);
  });

  it('should set level-up channel', async () => {
    const interaction = createMockInteraction();
    const channel = createMockTextChannel({ id: 'levelup-ch' });

    await command.onSetupLevelsChannel([interaction] as any, { channel });

    expect(guildService.updateSetting).toHaveBeenCalledWith(
      interaction.guildId,
      'levelUpChannelId',
      'levelup-ch'
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should add level role', async () => {
    const interaction = createMockInteraction();
    const role = { id: 'role-123', name: 'Level 5' };

    await command.onLevelRoleAdd([interaction] as any, { level: 5, role: role as any });

    expect(guildService.ensureGuild).toHaveBeenCalled();
    expect(levelRoleService.addLevelRole).toHaveBeenCalledWith(mockGuild.id, 5, 'role-123');
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should handle duplicate level role', async () => {
    const interaction = createMockInteraction();
    const role = { id: 'role-123', name: 'Level 5' };
    levelRoleService.addLevelRole.mockRejectedValue(new Error('Unique constraint'));

    await command.onLevelRoleAdd([interaction] as any, { level: 5, role: role as any });

    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    expect(embed.data.description).toContain('już istnieje');
  });

  it('should remove level role', async () => {
    const interaction = createMockInteraction();

    await command.onLevelRoleRemove([interaction] as any, { level: 5 });

    expect(levelRoleService.removeLevelRole).toHaveBeenCalledWith(mockGuild.id, 5);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should handle removing nonexistent level role', async () => {
    const interaction = createMockInteraction();
    levelRoleService.removeLevelRole.mockRejectedValue(new Error('Record not found'));

    await command.onLevelRoleRemove([interaction] as any, { level: 99 });

    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    expect(embed.data.description).toContain('Brak roli za poziom');
  });

  it('should list level roles', async () => {
    const interaction = createMockInteraction();
    levelRoleService.getLevelRoles.mockResolvedValue([
      { id: '1', guildId: mockGuild.id, level: 5, roleId: 'role-5', createdAt: new Date() },
      { id: '2', guildId: mockGuild.id, level: 10, roleId: 'role-10', createdAt: new Date() },
    ] as any);

    await command.onLevelRoleList([interaction] as any);

    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    expect(embed.data.description).toContain('Poziom **5**');
    expect(embed.data.description).toContain('Poziom **10**');
  });

  it('should handle empty level roles list', async () => {
    const interaction = createMockInteraction();
    levelRoleService.getLevelRoles.mockResolvedValue([]);

    await command.onLevelRoleList([interaction] as any);

    const replyCall = (interaction.reply as jest.Mock).mock.calls[0][0];
    const embed = replyCall.embeds[0];
    expect(embed.data.description).toContain('Brak skonfigurowanych');
  });
});
