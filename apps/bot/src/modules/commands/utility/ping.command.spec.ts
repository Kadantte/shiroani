import { PingCommand } from './ping.command';
import { createMockInteraction } from '@/test/mocks';

describe('PingCommand', () => {
  let command: PingCommand;

  beforeEach(() => {
    command = new PingCommand();
  });

  it('should reply with pong and latency info', async () => {
    const now = Date.now();
    const interaction = createMockInteraction({
      createdTimestamp: now,
    });
    (interaction.reply as jest.Mock).mockResolvedValue({
      createdTimestamp: now + 100,
    });

    await command.onPing([interaction] as any);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.any(String),
      fetchReply: true,
    });
    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Pong!'));
  });

  it('should show green status emoji for low latency', async () => {
    const now = Date.now();
    const interaction = createMockInteraction({
      createdTimestamp: now,
    });
    (interaction.reply as jest.Mock).mockResolvedValue({
      createdTimestamp: now + 50,
    });

    await command.onPing([interaction] as any);

    const editCall = (interaction.editReply as jest.Mock).mock.calls[0][0];
    expect(editCall).toMatch(/🟢/);
  });

  it('should show yellow status emoji for medium latency', async () => {
    const now = Date.now();
    const interaction = createMockInteraction({
      createdTimestamp: now,
    });
    (interaction.reply as jest.Mock).mockResolvedValue({
      createdTimestamp: now + 300,
    });

    await command.onPing([interaction] as any);

    const editCall = (interaction.editReply as jest.Mock).mock.calls[0][0];
    expect(editCall).toMatch(/🟡/);
  });

  it('should show red status emoji for high latency', async () => {
    const now = Date.now();
    const interaction = createMockInteraction({
      createdTimestamp: now,
    });
    (interaction.reply as jest.Mock).mockResolvedValue({
      createdTimestamp: now + 600,
    });

    await command.onPing([interaction] as any);

    const editCall = (interaction.editReply as jest.Mock).mock.calls[0][0];
    expect(editCall).toMatch(/🔴/);
  });
});
