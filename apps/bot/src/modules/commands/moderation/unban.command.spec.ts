import { MessageFlags } from 'discord.js';
import { UnbanCommand } from './unban.command';
import { ModLogService } from './mod-log.service';
import { createMockInteraction, createMockLogger } from '@/test/mocks';

describe('UnbanCommand', () => {
  let command: UnbanCommand;
  let modLog: jest.Mocked<Pick<ModLogService, 'log'>>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    modLog = { log: jest.fn().mockResolvedValue(undefined) };
    logger = createMockLogger();
    command = new UnbanCommand(modLog as unknown as ModLogService, logger as any);
  });

  it('should successfully unban a user by ID', async () => {
    const interaction = createMockInteraction({ commandName: 'unban' });
    (interaction.guild as any).members.unban = jest.fn().mockResolvedValue(undefined);

    await command.onUnban([interaction] as any, {
      userId: '55512345678901234',
      reason: 'Apelacja przyjęta',
    });

    expect(interaction.guild!.members.unban).toHaveBeenCalledWith(
      '55512345678901234',
      'Apelacja przyjęta'
    );
    expect(modLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UNBAN',
        targetUserId: '55512345678901234',
        reason: 'Apelacja przyjęta',
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
      })
    );
  });

  it('should use default reason when none provided', async () => {
    const interaction = createMockInteraction({ commandName: 'unban' });
    (interaction.guild as any).members.unban = jest.fn().mockResolvedValue(undefined);

    await command.onUnban([interaction] as any, {
      userId: '55512345678901234',
    });

    expect(interaction.guild!.members.unban).toHaveBeenCalledWith(
      '55512345678901234',
      'Brak podanego powodu'
    );
    expect(modLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Brak podanego powodu',
      })
    );
  });

  it('should reject invalid user ID format', async () => {
    const interaction = createMockInteraction({ commandName: 'unban' });

    await command.onUnban([interaction] as any, {
      userId: 'not-a-valid-id',
    });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should reject too-short user ID', async () => {
    const interaction = createMockInteraction({ commandName: 'unban' });

    await command.onUnban([interaction] as any, {
      userId: '123',
    });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });

  it('should handle unban failure gracefully', async () => {
    const interaction = createMockInteraction({ commandName: 'unban' });
    (interaction.guild as any).members.unban = jest
      .fn()
      .mockRejectedValue(new Error('Unknown Ban'));

    await command.onUnban([interaction] as any, {
      userId: '55512345678901234',
    });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
    expect(modLog.log).not.toHaveBeenCalled();
  });

  it('should log to mod log service on successful unban', async () => {
    const interaction = createMockInteraction({ commandName: 'unban' });
    (interaction.guild as any).members.unban = jest.fn().mockResolvedValue(undefined);

    await command.onUnban([interaction] as any, {
      userId: '55512345678901234',
      reason: 'Test reason',
    });

    expect(modLog.log).toHaveBeenCalledWith({
      guildId: interaction.guildId,
      action: 'UNBAN',
      targetUserId: '55512345678901234',
      moderatorId: interaction.user.id,
      reason: 'Test reason',
    });
  });
});
