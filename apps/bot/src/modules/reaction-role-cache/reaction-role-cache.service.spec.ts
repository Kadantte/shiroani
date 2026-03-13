import { ReactionRoleCacheService } from './reaction-role-cache.service';
import { createMockPrismaService } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('ReactionRoleCacheService', () => {
  let service: ReactionRoleCacheService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new ReactionRoleCacheService(prisma as unknown as PrismaService);
  });

  describe('ensureInitialized', () => {
    it('should load message IDs from database on first call', async () => {
      prisma.reactionRole.findMany.mockResolvedValue([
        { messageId: 'msg-1' },
        { messageId: 'msg-2' },
      ]);

      await service.ensureInitialized();

      expect(prisma.reactionRole.findMany).toHaveBeenCalledWith({
        select: { messageId: true },
        distinct: ['messageId'],
      });
      expect(service.has('msg-1')).toBe(true);
      expect(service.has('msg-2')).toBe(true);
      expect(service.has('msg-3')).toBe(false);
    });

    it('should only initialize once', async () => {
      prisma.reactionRole.findMany.mockResolvedValue([]);

      await service.ensureInitialized();
      await service.ensureInitialized();

      expect(prisma.reactionRole.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('has', () => {
    it('should return false for unknown message IDs', () => {
      expect(service.has('unknown')).toBe(false);
    });
  });

  describe('add', () => {
    it('should add a message ID to the known set', () => {
      service.add('msg-new');
      expect(service.has('msg-new')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove a message ID from the known set', () => {
      service.add('msg-to-remove');
      expect(service.has('msg-to-remove')).toBe(true);

      service.remove('msg-to-remove');
      expect(service.has('msg-to-remove')).toBe(false);
    });

    it('should be a no-op for unknown message IDs', () => {
      service.remove('nonexistent');
      expect(service.has('nonexistent')).toBe(false);
    });
  });
});
