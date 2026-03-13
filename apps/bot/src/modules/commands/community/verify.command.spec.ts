import { Collection, MessageFlags } from 'discord.js';
import { VerifyCommand } from './verify.command';
import {
  createMockInteraction,
  createMockTextChannel,
  createMockPrismaService,
  createMockLogger,
} from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { GuildService } from '@/modules/guild/guild.service';

describe('VerifyCommand', () => {
  let command: VerifyCommand;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let guildService: jest.Mocked<Pick<GuildService, 'ensureGuild' | 'findByDiscordId'>>;
  let logger: ReturnType<typeof createMockLogger>;

  const mockGuild = {
    id: 'internal-id-1',
    discordId: '987654321',
    name: 'Test Guild',
    verifyRoleId: 'role-123',
    verifyChannelId: 'channel-123',
    verifyMessageId: 'message-123',
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    guildService = {
      ensureGuild: jest.fn().mockResolvedValue(mockGuild),
      findByDiscordId: jest.fn().mockResolvedValue(mockGuild),
    };
    logger = createMockLogger();
    (prisma.guild.update as jest.Mock).mockResolvedValue({});

    command = new VerifyCommand(
      prisma as unknown as PrismaService,
      guildService as unknown as GuildService,
      logger as any
    );
  });

  function createMockRole(id = 'role-123') {
    return { id, name: 'Verified', toString: () => `<@&${id}>` };
  }

  function createMockMessage(id = 'msg-456') {
    return { id };
  }

  function withIconURL(interaction: ReturnType<typeof createMockInteraction>) {
    (interaction.guild as any).iconURL = jest
      .fn()
      .mockReturnValue('https://cdn.example.com/icon.png');
    return interaction;
  }

  describe('onSetupVerify', () => {
    it('should create embed with button and save config', async () => {
      const channel = createMockTextChannel({ id: 'verify-ch' });
      const mockMessage = createMockMessage();
      (channel.send as jest.Mock).mockResolvedValue(mockMessage);

      const role = createMockRole();
      const interaction = withIconURL(createMockInteraction());

      await command.onSetupVerify([interaction] as any, {
        channel,
        role: role as any,
        rules: undefined,
      });

      expect(channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
      expect(prisma.guild.update).toHaveBeenCalledWith({
        where: { id: 'internal-id-1' },
        data: {
          verifyChannelId: 'verify-ch',
          verifyRoleId: 'role-123',
          verifyMessageId: 'msg-456',
        },
      });
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should use provided rules text in embed', async () => {
      const channel = createMockTextChannel({ id: 'verify-ch' });
      const mockMessage = createMockMessage();
      (channel.send as jest.Mock).mockResolvedValue(mockMessage);

      const role = createMockRole();
      const interaction = withIconURL(createMockInteraction());

      await command.onSetupVerify([interaction] as any, {
        channel,
        role: role as any,
        rules: 'Przeczytaj regulamin!',
      });

      const sentArgs = (channel.send as jest.Mock).mock.calls[0][0];
      const embedData = sentArgs.embeds[0].data;
      expect(embedData.description).toBe('Przeczytaj regulamin!');
    });

    it('should use default text when no rules provided', async () => {
      const channel = createMockTextChannel({ id: 'verify-ch' });
      const mockMessage = createMockMessage();
      (channel.send as jest.Mock).mockResolvedValue(mockMessage);

      const role = createMockRole();
      const interaction = withIconURL(createMockInteraction());

      await command.onSetupVerify([interaction] as any, {
        channel,
        role: role as any,
        rules: undefined,
      });

      const sentArgs = (channel.send as jest.Mock).mock.calls[0][0];
      const embedData = sentArgs.embeds[0].data;
      expect(embedData.description).toBe(
        'Kliknij przycisk poniżej, aby zweryfikować się na serwerze.'
      );
    });
    it('should return error when channel.send fails', async () => {
      const channel = createMockTextChannel({ id: 'verify-ch' });
      (channel.send as jest.Mock).mockRejectedValue(new Error('Missing Permissions'));

      const role = createMockRole();
      const interaction = withIconURL(createMockInteraction());

      await command.onSetupVerify([interaction] as any, {
        channel,
        role: role as any,
        rules: undefined,
      });

      expect(prisma.guild.update).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });
  });

  describe('onVerifyButton', () => {
    function createButtonInteraction(overrides: Record<string, unknown> = {}) {
      const rolesCache = new Collection<string, unknown>();
      return {
        guild: { id: '987654321', name: 'Test Guild' },
        guildId: '987654321',
        member: {
          roles: {
            cache: rolesCache,
            add: jest.fn().mockResolvedValue(undefined),
          },
        },
        user: { id: '123456789' },
        reply: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
    }

    it('should add role to user', async () => {
      const interaction = createButtonInteraction();

      await command.onVerifyButton([interaction] as any);

      expect(interaction.member.roles.add).toHaveBeenCalledWith('role-123');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should reply already verified when user has role', async () => {
      const rolesCache = new Collection<string, unknown>();
      rolesCache.set('role-123', { id: 'role-123' });

      const interaction = createButtonInteraction({
        member: {
          roles: {
            cache: rolesCache,
            add: jest.fn(),
          },
        },
      });

      await command.onVerifyButton([interaction] as any);

      expect(interaction.member.roles.add).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should handle missing config gracefully', async () => {
      guildService.findByDiscordId.mockResolvedValue({
        ...mockGuild,
        verifyRoleId: null,
      } as any);

      const interaction = createButtonInteraction();

      await command.onVerifyButton([interaction] as any);

      expect(interaction.member.roles.add).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should handle role add failure', async () => {
      const interaction = createButtonInteraction();
      (interaction.member.roles.add as jest.Mock).mockRejectedValue(
        new Error('Missing Permissions')
      );

      await command.onVerifyButton([interaction] as any);

      expect(logger.error).toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should reply error when used outside a guild', async () => {
      const interaction = createButtonInteraction({
        guild: null,
        member: null,
      });

      await command.onVerifyButton([interaction] as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should log successful verification', async () => {
      const interaction = createButtonInteraction();

      await command.onVerifyButton([interaction] as any);

      expect(logger.info).toHaveBeenCalledWith(
        { userId: '123456789', guildId: '987654321' },
        'User verified'
      );
    });
  });
});
