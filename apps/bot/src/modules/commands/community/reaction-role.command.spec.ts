import { MessageFlags, Collection, EmbedBuilder } from 'discord.js';
import { ReactionRoleCommand } from './reaction-role.command';
import { createMockInteraction, createMockLogger, createMockPrismaService } from '@/test/mocks';
import { GuildService } from '@/modules/guild/guild.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ReactionRoleEvent } from '@/modules/events/reaction-role.event';

describe('ReactionRoleCommand', () => {
  let command: ReactionRoleCommand;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let guildService: jest.Mocked<Pick<GuildService, 'ensureGuild' | 'findByDiscordId'>>;
  let reactionRoleEvent: jest.Mocked<
    Pick<ReactionRoleEvent, 'addKnownMessage' | 'removeKnownMessage'>
  >;
  let logger: ReturnType<typeof createMockLogger>;

  const dbGuild = { id: 'internal-1', discordId: '987654321', name: 'Test Guild' };

  beforeEach(() => {
    prisma = createMockPrismaService();
    guildService = {
      ensureGuild: jest.fn().mockResolvedValue(dbGuild),
      findByDiscordId: jest.fn().mockResolvedValue(dbGuild),
    };
    reactionRoleEvent = {
      addKnownMessage: jest.fn(),
      removeKnownMessage: jest.fn(),
    };
    logger = createMockLogger();
    command = new ReactionRoleCommand(
      prisma as unknown as PrismaService,
      guildService as unknown as GuildService,
      reactionRoleEvent as unknown as ReactionRoleEvent,
      logger as any
    );
  });

  describe('rr-create', () => {
    it('should create an embed and reply with the message ID', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-create' });
      const sentMessage = { id: 'msg-123' };
      const channel = {
        id: '111222333',
        send: jest.fn().mockResolvedValue(sentMessage),
        toString: () => '<#111222333>',
      };

      await command.onRrCreate([interaction] as any, {
        channel: channel as any,
        title: 'Role',
        description: 'Reaguj aby uzyskać rolę',
      });

      expect(channel.send).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([expect.any(EmbedBuilder)]),
      });
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
          embeds: expect.any(Array),
        })
      );
    });

    it('should handle channel send failure', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-create' });
      const channel = {
        id: '111222333',
        send: jest.fn().mockRejectedValue(new Error('Missing Access')),
      };

      await command.onRrCreate([interaction] as any, {
        channel: channel as any,
        title: 'Role',
        description: 'Test',
      });

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });
  });

  describe('rr-add', () => {
    function createMessageMock() {
      return {
        id: 'msg-123',
        channel: { id: 'ch-456' },
        react: jest.fn().mockResolvedValue(undefined),
        embeds: [{ description: 'Reaguj aby uzyskać rolę\u200B', title: 'Role', color: 0x5865f2 }],
        edit: jest.fn().mockResolvedValue(undefined),
        reactions: { cache: new Collection() },
      };
    }

    it('should save mapping to DB and react to message', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-add' });
      const message = createMessageMock();

      // findMessage: first findFirst for known channel, then channel fetch + message fetch
      prisma.reactionRole.findUnique.mockResolvedValue(null); // no duplicate
      prisma.reactionRole.findFirst.mockResolvedValue({ channelId: 'ch-456' });
      prisma.reactionRole.findMany.mockResolvedValue([]);
      prisma.reactionRole.create.mockResolvedValue({
        id: 'rr-1',
        guildId: 'internal-1',
        messageId: 'msg-123',
        channelId: 'ch-456',
        emoji: '🎮',
        roleId: 'role-789',
        createdAt: new Date(),
      });

      const textChannel = {
        isTextBased: () => true,
        messages: { fetch: jest.fn().mockResolvedValue(message) },
      };

      (interaction.guild as any).channels = {
        fetch: jest.fn().mockResolvedValue(textChannel),
        cache: new Collection(),
      };

      const role = { id: 'role-789', toString: () => '<@&role-789>' };

      await command.onRrAdd([interaction] as any, {
        messageId: 'msg-123',
        emoji: '🎮',
        role: role as any,
      });

      expect(prisma.reactionRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guildId: 'internal-1',
          messageId: 'msg-123',
          emoji: '🎮',
          roleId: 'role-789',
        }),
      });
      expect(message.react).toHaveBeenCalledWith('🎮'); // resolvedEmoji for unicode is same as input
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should reject duplicate emoji on same message', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-add' });
      const message = createMessageMock();

      const textChannel = {
        isTextBased: () => true,
        messages: { fetch: jest.fn().mockResolvedValue(message) },
      };

      (interaction.guild as any).channels = {
        fetch: jest.fn().mockResolvedValue(textChannel),
        cache: new Collection(),
      };

      prisma.reactionRole.findFirst.mockResolvedValue({ channelId: 'ch-456' });
      prisma.reactionRole.findUnique.mockResolvedValue({
        id: 'rr-1',
        emoji: '🎮',
        roleId: 'role-789',
      });

      const role = { id: 'role-789', toString: () => '<@&role-789>' };

      await command.onRrAdd([interaction] as any, {
        messageId: 'msg-123',
        emoji: '🎮',
        role: role as any,
      });

      expect(prisma.reactionRole.create).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should resolve custom emoji format to ID', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-add' });
      const message = createMessageMock();

      prisma.reactionRole.findUnique.mockResolvedValue(null);
      prisma.reactionRole.findFirst.mockResolvedValue({ channelId: 'ch-456' });
      prisma.reactionRole.findMany.mockResolvedValue([]);
      prisma.reactionRole.create.mockResolvedValue({
        id: 'rr-2',
        guildId: 'internal-1',
        messageId: 'msg-123',
        channelId: 'ch-456',
        emoji: '123456789',
        roleId: 'role-789',
        createdAt: new Date(),
      });

      const textChannel = {
        isTextBased: () => true,
        messages: { fetch: jest.fn().mockResolvedValue(message) },
      };

      (interaction.guild as any).channels = {
        fetch: jest.fn().mockResolvedValue(textChannel),
        cache: new Collection(),
      };

      const role = { id: 'role-789', toString: () => '<@&role-789>' };

      await command.onRrAdd([interaction] as any, {
        messageId: 'msg-123',
        emoji: '<:custom:123456789>',
        role: role as any,
      });

      expect(prisma.reactionRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emoji: '123456789',
        }),
      });
    });
  });

  describe('rr-remove', () => {
    it('should delete mapping from DB', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-remove' });

      prisma.reactionRole.findUnique.mockResolvedValue({
        id: 'rr-1',
        messageId: 'msg-123',
        emoji: '🎮',
        roleId: 'role-789',
      });
      prisma.reactionRole.delete.mockResolvedValue(undefined);
      prisma.reactionRole.count.mockResolvedValue(0);
      prisma.reactionRole.findFirst.mockResolvedValue(null);

      (interaction.guild as any).channels = {
        fetch: jest.fn().mockRejectedValue(new Error('Not found')),
        cache: new Collection(),
      };

      await command.onRrRemove([interaction] as any, {
        messageId: 'msg-123',
        emoji: '🎮',
      });

      expect(prisma.reactionRole.delete).toHaveBeenCalledWith({
        where: { messageId_emoji: { messageId: 'msg-123', emoji: '🎮' } },
      });
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should return error when mapping not found', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-remove' });

      prisma.reactionRole.findUnique.mockResolvedValue(null);

      await command.onRrRemove([interaction] as any, {
        messageId: 'msg-123',
        emoji: '🎮',
      });

      expect(prisma.reactionRole.delete).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });
  });

  describe('rr-list', () => {
    it('should show all mappings for guild', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-list' });

      prisma.reactionRole.findMany.mockResolvedValue([
        {
          id: 'rr-1',
          messageId: 'msg-123',
          channelId: 'ch-456',
          emoji: '🎮',
          roleId: 'role-789',
          createdAt: new Date(),
        },
        {
          id: 'rr-2',
          messageId: 'msg-123',
          channelId: 'ch-456',
          emoji: '🎵',
          roleId: 'role-101',
          createdAt: new Date(),
        },
      ]);

      await command.onRrList([interaction] as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
          embeds: expect.arrayContaining([expect.any(EmbedBuilder)]),
        })
      );
    });

    it('should show info when no mappings exist', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-list' });

      prisma.reactionRole.findMany.mockResolvedValue([]);

      await command.onRrList([interaction] as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });

    it('should show info when guild not in DB', async () => {
      const interaction = createMockInteraction({ commandName: 'rr-list' });

      guildService.findByDiscordId.mockResolvedValue(null);

      await command.onRrList([interaction] as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
        })
      );
    });
  });
});
