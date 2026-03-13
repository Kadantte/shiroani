import { Collection, MessageFlags } from 'discord.js';
import { ClearCommand } from './clear.command';
import { ModLogService } from './mod-log.service';
import { createMockInteraction, createMockTextChannel } from '@/test/mocks';

describe('ClearCommand', () => {
  let command: ClearCommand;
  let modLog: jest.Mocked<Pick<ModLogService, 'log'>>;

  beforeEach(() => {
    modLog = { log: jest.fn().mockResolvedValue(undefined) };
    command = new ClearCommand(modLog as unknown as ModLogService);
  });

  it('should successfully clear messages', async () => {
    const deleted = new Collection<string, any>();
    deleted.set('1', {});
    deleted.set('2', {});
    deleted.set('3', {});

    const channel = createMockTextChannel();
    (channel.bulkDelete as jest.Mock).mockResolvedValue(deleted);

    const interaction = createMockInteraction({
      commandName: 'clear',
      channel,
    });

    await command.onClear([interaction] as any, { amount: 3 });

    expect(channel.bulkDelete).toHaveBeenCalledWith(3, true);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining('3'),
            }),
          }),
        ]),
      })
    );
  });

  it('should report skipped old messages', async () => {
    const deleted = new Collection<string, any>();
    deleted.set('1', {});
    deleted.set('2', {});
    // Requested 5, only 2 deleted

    const channel = createMockTextChannel();
    (channel.bulkDelete as jest.Mock).mockResolvedValue(deleted);

    const interaction = createMockInteraction({
      commandName: 'clear',
      channel,
    });

    await command.onClear([interaction] as any, { amount: 5 });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining('3 pominięto'),
            }),
          }),
        ]),
      })
    );
  });

  it('should log to mod log service', async () => {
    const deleted = new Collection<string, any>();
    deleted.set('1', {});

    const channel = createMockTextChannel();
    (channel.bulkDelete as jest.Mock).mockResolvedValue(deleted);

    const interaction = createMockInteraction({
      commandName: 'clear',
      channel,
    });

    await command.onClear([interaction] as any, { amount: 1 });

    expect(modLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLEAR_MESSAGES',
        messagesCleared: 1,
      })
    );
  });

  it('should return error for non-text channels', async () => {
    const interaction = createMockInteraction({
      commandName: 'clear',
      channel: { id: '123' }, // Not a TextChannel instance
    });

    await command.onClear([interaction] as any, { amount: 5 });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      })
    );
  });
});
