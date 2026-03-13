import { Collection, MessageFlags } from 'discord.js';
import { BanCommand } from './ban.command';
import { ModLogService } from './mod-log.service';
import { createMockInteraction, createMockUser } from '@/test/mocks';

describe('BanCommand', () => {
  let command: BanCommand;
  let modLog: jest.Mocked<Pick<ModLogService, 'log'>>;

  beforeEach(() => {
    modLog = { log: jest.fn().mockResolvedValue(undefined) };
    command = new BanCommand(modLog as unknown as ModLogService);
  });

  function setupInteraction(targetUser: any, memberInCache?: any) {
    const membersCache = new Collection<string, any>();
    if (memberInCache) {
      membersCache.set(targetUser.id, memberInCache);
    }

    const interaction = createMockInteraction({
      commandName: 'ban',
    });
    (interaction.guild as any).members.cache = membersCache;
    (interaction.guild as any).members.ban = jest.fn().mockResolvedValue(undefined);

    return interaction;
  }

  it('should successfully ban a user', async () => {
    const targetUser = createMockUser({ id: '555', tag: 'Target#0001' });
    const interaction = setupInteraction(targetUser);

    await command.onBan([interaction] as any, { user: targetUser, reason: 'Spam' });

    expect(interaction.guild!.members.ban).toHaveBeenCalledWith('555', {
      reason: 'Spam',
    });
    expect(modLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BAN',
        targetUserId: '555',
        reason: 'Spam',
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
      })
    );
  });

  it('should prevent banning yourself', async () => {
    const selfUser = createMockUser({ id: '123456789' });
    const interaction = setupInteraction(selfUser);
    // interaction.user.id is '123456789' by default from mock

    await command.onBan([interaction] as any, { user: selfUser });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
    expect(interaction.guild!.members.ban).not.toHaveBeenCalled();
  });

  it('should prevent banning the bot', async () => {
    const botUser = createMockUser({ id: '999888777' }); // matches client.user.id
    const interaction = setupInteraction(botUser);

    await command.onBan([interaction] as any, { user: botUser });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
    expect(interaction.guild!.members.ban).not.toHaveBeenCalled();
  });

  it('should prevent banning a user with higher or equal role', async () => {
    const targetUser = createMockUser({ id: '555', tag: 'HighRole#0001' });
    const targetMember = {
      roles: { highest: { position: 10 } },
      bannable: true,
    };
    const interaction = setupInteraction(targetUser, targetMember);
    // Moderator role position is 5 by default from mock

    await command.onBan([interaction] as any, { user: targetUser });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
    expect(interaction.guild!.members.ban).not.toHaveBeenCalled();
  });

  it('should handle non-bannable user', async () => {
    const targetUser = createMockUser({ id: '555', tag: 'Protected#0001' });
    const targetMember = {
      roles: { highest: { position: 1 } },
      bannable: false,
    };
    const interaction = setupInteraction(targetUser, targetMember);

    await command.onBan([interaction] as any, { user: targetUser });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
    expect(interaction.guild!.members.ban).not.toHaveBeenCalled();
  });

  it('should log to mod log service on successful ban', async () => {
    const targetUser = createMockUser({ id: '555', tag: 'Target#0001' });
    const interaction = setupInteraction(targetUser);

    await command.onBan([interaction] as any, { user: targetUser, reason: 'Rule violation' });

    expect(modLog.log).toHaveBeenCalledWith({
      guildId: interaction.guildId,
      action: 'BAN',
      targetUserId: '555',
      moderatorId: interaction.user.id,
      reason: 'Rule violation',
    });
  });
});
