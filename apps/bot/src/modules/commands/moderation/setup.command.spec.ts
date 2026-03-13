import { MessageFlags } from 'discord.js';
import { SetupCommand } from './setup.command';
import { createMockInteraction, createMockTextChannel } from '@/test/mocks';
import { GuildService } from '@/modules/guild/guild.service';

describe('SetupCommand', () => {
  let command: SetupCommand;
  let guildService: jest.Mocked<Pick<GuildService, 'ensureGuild' | 'updateSetting'>>;

  const mockGuild = {
    id: 'internal-id-1',
    discordId: '987654321',
    name: 'Test Guild',
  };

  beforeEach(() => {
    guildService = {
      ensureGuild: jest.fn().mockResolvedValue(mockGuild),
      updateSetting: jest.fn().mockResolvedValue(undefined),
    };
    command = new SetupCommand(guildService as unknown as GuildService);
  });

  it('should set welcome channel', async () => {
    const channel = createMockTextChannel({ id: 'welcome-ch' });
    const interaction = createMockInteraction();

    await command.onSetupWelcome([interaction] as any, { channel });

    expect(guildService.ensureGuild).toHaveBeenCalledWith(
      interaction.guildId,
      interaction.guild!.name
    );
    expect(guildService.updateSetting).toHaveBeenCalledWith(
      interaction.guildId,
      'welcomeChannelId',
      'welcome-ch'
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should set goodbye channel', async () => {
    const channel = createMockTextChannel({ id: 'goodbye-ch' });
    const interaction = createMockInteraction();

    await command.onSetupGoodbye([interaction] as any, { channel });

    expect(guildService.updateSetting).toHaveBeenCalledWith(
      interaction.guildId,
      'goodbyeChannelId',
      'goodbye-ch'
    );
  });

  it('should set modlog channel', async () => {
    const channel = createMockTextChannel({ id: 'modlog-ch' });
    const interaction = createMockInteraction();

    await command.onSetupModLog([interaction] as any, { channel });

    expect(guildService.updateSetting).toHaveBeenCalledWith(
      interaction.guildId,
      'modLogChannelId',
      'modlog-ch'
    );
  });

  it('should call guildService.ensureGuild with correct args', async () => {
    const channel = createMockTextChannel({ id: 'ch-1' });
    const interaction = createMockInteraction();

    await command.onSetupWelcome([interaction] as any, { channel });

    expect(guildService.ensureGuild).toHaveBeenCalledWith(
      interaction.guildId,
      interaction.guild!.name
    );
  });
});
