import { ReactionRoleEvent } from './reaction-role.event';
import { createMockLogger, createMockPrismaService } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ReactionRoleCacheService } from '@/modules/reaction-role-cache/reaction-role-cache.service';

describe('ReactionRoleEvent', () => {
  let event: ReactionRoleEvent;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let cache: jest.Mocked<
    Pick<ReactionRoleCacheService, 'ensureInitialized' | 'has' | 'add' | 'remove'>
  >;
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
    cache = {
      ensureInitialized: jest.fn().mockResolvedValue(undefined),
      has: jest.fn().mockReturnValue(true), // msg-123 is known by default
      add: jest.fn(),
      remove: jest.fn(),
    };
    event = new ReactionRoleEvent(
      prisma as unknown as PrismaService,
      cache as unknown as ReactionRoleCacheService,
      logger as any
    );
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

      expect(cache.ensureInitialized).toHaveBeenCalled();
      expect(cache.has).toHaveBeenCalledWith('msg-123');
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
      cache.has.mockReturnValue(false);
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
});
