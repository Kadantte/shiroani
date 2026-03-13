import { MessageFlags } from 'discord.js';
import { SetupCommand } from './setup.command';
import {
  createMockInteraction,
  createMockPrismaService,
  createMockTextChannel,
} from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('SetupCommand', () => {
  let command: SetupCommand;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma.guild.upsert as jest.Mock).mockResolvedValue({
      id: 'internal-id-1',
      discordId: '987654321',
      name: 'Test Guild',
    });
    (prisma.guild.update as jest.Mock).mockResolvedValue({});
    command = new SetupCommand(prisma as unknown as PrismaService);
  });

  it('should set welcome channel', async () => {
    const channel = createMockTextChannel({ id: 'welcome-ch' });
    const interaction = createMockInteraction();

    await command.onSetupWelcome([interaction] as any, { channel });

    expect(prisma.guild.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { discordId: interaction.guildId },
      })
    );
    expect(prisma.guild.update).toHaveBeenCalledWith({
      where: { id: 'internal-id-1' },
      data: { welcomeChannelId: 'welcome-ch' },
    });
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

    expect(prisma.guild.update).toHaveBeenCalledWith({
      where: { id: 'internal-id-1' },
      data: { goodbyeChannelId: 'goodbye-ch' },
    });
  });

  it('should set modlog channel', async () => {
    const channel = createMockTextChannel({ id: 'modlog-ch' });
    const interaction = createMockInteraction();

    await command.onSetupModLog([interaction] as any, { channel });

    expect(prisma.guild.update).toHaveBeenCalledWith({
      where: { id: 'internal-id-1' },
      data: { modLogChannelId: 'modlog-ch' },
    });
  });

  it('should create guild if not exists (upsert)', async () => {
    const channel = createMockTextChannel({ id: 'ch-1' });
    const interaction = createMockInteraction();

    await command.onSetupWelcome([interaction] as any, { channel });

    expect(prisma.guild.upsert).toHaveBeenCalledWith({
      where: { discordId: interaction.guildId },
      update: { name: interaction.guild!.name },
      create: { discordId: interaction.guildId, name: interaction.guild!.name },
    });
  });
});
