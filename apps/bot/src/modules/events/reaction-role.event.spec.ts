import { ReactionRoleEvent } from './reaction-role.event';
import { createMockLogger, createMockPrismaService } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('ReactionRoleEvent', () => {
  let event: ReactionRoleEvent;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let logger: ReturnType<typeof createMockLogger>;

  const mapping = {
    id: 'rr-1',
    guildId: 'internal-1',
    messageId: 'msg-123',
    channelId: 'ch-456',
    emoji: '🎮',
    roleId: 'role-789',
    createdAt: new Date(),
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    logger = createMockLogger();
    event = new ReactionRoleEvent(prisma as unknown as PrismaService, logger as any);

    // Default: ensureInitialized loads msg-123 into the known set
    prisma.reactionRole.findMany.mockResolvedValue([{ messageId: 'msg-123' }]);
  });

  function createMockReaction(overrides: Record<string, unknown> = {}) {
    return {
      partial: false,
      fetch: jest.fn().mockResolvedValue(undefined),
      emoji: { id: null, name: '🎮' },
      message: {
        id: 'msg-123',
        guild: {
          id: '987654321',
          members: {
            fetch: jest.fn().mockResolvedValue({
              roles: {
                add: jest.fn().mockResolvedValue(undefined),
                remove: jest.fn().mockResolvedValue(undefined),
              },
            }),
          },
        },
      },
      ...overrides,
    };
  }

  function createMockUser(overrides: Record<string, unknown> = {}) {
    return {
      id: '123456789',
      bot: false,
      ...overrides,
    };
  }

  describe('onReactionAdd', () => {
    it('should add role on reaction add', async () => {
      const reaction = createMockReaction();
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      await event.onReactionAdd([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).toHaveBeenCalledWith({
        where: { messageId_emoji: { messageId: 'msg-123', emoji: '🎮' } },
      });
      const member = await reaction.message.guild.members.fetch.mock.results[0].value;
      expect(member.roles.add).toHaveBeenCalledWith('role-789');
    });

    it('should skip bot reactions', async () => {
      const reaction = createMockReaction();
      const user = createMockUser({ bot: true });

      await event.onReactionAdd([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).not.toHaveBeenCalled();
    });

    it('should skip reactions on unknown messages (not in cache)', async () => {
      // ensureInitialized loads empty set
      prisma.reactionRole.findMany.mockResolvedValue([]);
      const reaction = createMockReaction({
        message: { id: 'unknown-msg', guild: { id: '987654321' } },
      });
      const user = createMockUser();

      await event.onReactionAdd([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).not.toHaveBeenCalled();
    });

    it('should skip reactions not mapped in DB', async () => {
      const reaction = createMockReaction();
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(null);

      await event.onReactionAdd([reaction, user] as any);

      expect(reaction.message.guild.members.fetch).not.toHaveBeenCalled();
    });

    it('should handle partial reactions', async () => {
      const reaction = createMockReaction({ partial: true });
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      await event.onReactionAdd([reaction, user] as any);

      expect(reaction.fetch).toHaveBeenCalled();
      const member = await reaction.message.guild.members.fetch.mock.results[0].value;
      expect(member.roles.add).toHaveBeenCalledWith('role-789');
    });

    it('should handle partial reaction fetch failure gracefully', async () => {
      const reaction = createMockReaction({
        partial: true,
        fetch: jest.fn().mockRejectedValue(new Error('Unknown Message')),
      });
      const user = createMockUser();

      await event.onReactionAdd([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).not.toHaveBeenCalled();
    });

    it('should use custom emoji ID when available', async () => {
      const reaction = createMockReaction({
        emoji: { id: '123456789', name: 'custom' },
      });
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      await event.onReactionAdd([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).toHaveBeenCalledWith({
        where: { messageId_emoji: { messageId: 'msg-123', emoji: '123456789' } },
      });
    });
  });

  describe('onReactionRemove', () => {
    it('should remove role on reaction remove', async () => {
      const reaction = createMockReaction();
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      await event.onReactionRemove([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).toHaveBeenCalledWith({
        where: { messageId_emoji: { messageId: 'msg-123', emoji: '🎮' } },
      });
      const member = await reaction.message.guild.members.fetch.mock.results[0].value;
      expect(member.roles.remove).toHaveBeenCalledWith('role-789');
    });

    it('should skip bot reactions', async () => {
      const reaction = createMockReaction();
      const user = createMockUser({ bot: true });

      await event.onReactionRemove([reaction, user] as any);

      expect(prisma.reactionRole.findUnique).not.toHaveBeenCalled();
    });

    it('should skip reactions not mapped in DB', async () => {
      const reaction = createMockReaction();
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(null);

      await event.onReactionRemove([reaction, user] as any);

      expect(reaction.message.guild.members.fetch).not.toHaveBeenCalled();
    });

    it('should handle partial reactions', async () => {
      const reaction = createMockReaction({ partial: true });
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      await event.onReactionRemove([reaction, user] as any);

      expect(reaction.fetch).toHaveBeenCalled();
      const member = await reaction.message.guild.members.fetch.mock.results[0].value;
      expect(member.roles.remove).toHaveBeenCalledWith('role-789');
    });
  });

  describe('cache management', () => {
    it('should allow adding known message IDs', async () => {
      prisma.reactionRole.findMany.mockResolvedValue([]);
      const reaction = createMockReaction({
        message: {
          id: 'new-msg',
          guild: {
            id: '987654321',
            members: {
              fetch: jest
                .fn()
                .mockResolvedValue({ roles: { add: jest.fn().mockResolvedValue(undefined) } }),
            },
          },
        },
      });
      const user = createMockUser();

      // Before adding, reaction on new-msg should be skipped
      await event.onReactionAdd([reaction, user] as any);
      expect(prisma.reactionRole.findUnique).not.toHaveBeenCalled();

      // Add to cache and retry
      event.addKnownMessage('new-msg');
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      await event.onReactionAdd([reaction, user] as any);
      expect(prisma.reactionRole.findUnique).toHaveBeenCalled();
    });

    it('should allow removing known message IDs', async () => {
      const reaction = createMockReaction();
      const user = createMockUser();
      prisma.reactionRole.findUnique.mockResolvedValue(mapping);

      // First call should work (msg-123 is in cache from ensureInitialized)
      await event.onReactionAdd([reaction, user] as any);
      expect(prisma.reactionRole.findUnique).toHaveBeenCalled();

      // Remove from cache
      event.removeKnownMessage('msg-123');
      prisma.reactionRole.findUnique.mockClear();

      // Now should be skipped
      await event.onReactionAdd([reaction, user] as any);
      expect(prisma.reactionRole.findUnique).not.toHaveBeenCalled();
    });
  });
});
