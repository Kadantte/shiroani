import { XpService } from './xp.service';
import { createMockPrismaService } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';

function createMockRedisService() {
  return {
    ttl: jest.fn(),
    set: jest.fn(),
    zadd: jest.fn(),
    zrevrank: jest.fn(),
    zrevrange: jest.fn(),
    zcard: jest.fn(),
    zrem: jest.fn(),
  };
}

describe('XpService', () => {
  let service: XpService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    service = new XpService(prisma as unknown as PrismaService, redis as unknown as RedisService);
  });

  describe('xpForLevel', () => {
    it('should return 100 for level 0', () => {
      expect(service.xpForLevel(0)).toBe(100);
    });

    it('should return 155 for level 1', () => {
      expect(service.xpForLevel(1)).toBe(155);
    });

    it('should return 1100 for level 10', () => {
      // 5*(10^2) + 50*10 + 100 = 500 + 500 + 100
      expect(service.xpForLevel(10)).toBe(1100);
    });
  });

  describe('totalXpForLevel', () => {
    it('should return 0 for level 0', () => {
      expect(service.totalXpForLevel(0)).toBe(0);
    });

    it('should return 100 for level 1 (sum of xpForLevel(0))', () => {
      expect(service.totalXpForLevel(1)).toBe(100);
    });

    it('should be consistent with xpForLevel', () => {
      const total5 = service.totalXpForLevel(5);
      let manual = 0;
      for (let i = 0; i < 5; i++) {
        manual += service.xpForLevel(i);
      }
      expect(total5).toBe(manual);
    });
  });

  describe('levelFromXp', () => {
    it('should return 0 for 0 XP', () => {
      expect(service.levelFromXp(0)).toBe(0);
    });

    it('should return 0 for 99 XP (just under level 1)', () => {
      expect(service.levelFromXp(99)).toBe(0);
    });

    it('should return 1 for exactly 100 XP', () => {
      expect(service.levelFromXp(100)).toBe(1);
    });

    it('should be consistent with totalXpForLevel', () => {
      for (let level = 0; level <= 20; level++) {
        const totalXp = service.totalXpForLevel(level);
        expect(service.levelFromXp(totalXp)).toBe(level);
      }
    });

    it('should not level up with partial XP', () => {
      const totalForLevel5 = service.totalXpForLevel(5);
      expect(service.levelFromXp(totalForLevel5 - 1)).toBe(4);
    });
  });

  describe('randomXpAmount', () => {
    it('should return values within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = service.randomXpAmount(15, 25);
        expect(result).toBeGreaterThanOrEqual(15);
        expect(result).toBeLessThanOrEqual(25);
      }
    });

    it('should return exact value when min equals max', () => {
      expect(service.randomXpAmount(20, 20)).toBe(20);
    });
  });

  describe('isOnCooldown', () => {
    it('should return true when TTL is positive', async () => {
      (redis.ttl as jest.Mock).mockResolvedValue(30);

      const result = await service.isOnCooldown('guild-1', 'user-1');

      expect(result).toBe(true);
      expect(redis.ttl).toHaveBeenCalledWith('xp:cooldown:guild-1:user-1');
    });

    it('should return false when TTL is 0 or negative', async () => {
      (redis.ttl as jest.Mock).mockResolvedValue(-2);

      const result = await service.isOnCooldown('guild-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('setCooldown', () => {
    it('should set a Redis key with expiry', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await service.setCooldown('guild-1', 'user-1', 60);

      expect(redis.set).toHaveBeenCalledWith('xp:cooldown:guild-1:user-1', '1', 'EX', 60);
    });
  });

  describe('awardXp', () => {
    it('should create a new member when one does not exist', async () => {
      const upserted = { id: 'member-1', xp: 20, level: 0, messages: 1 };
      (prisma.member.upsert as jest.Mock).mockResolvedValue(upserted);
      (redis.zadd as jest.Mock).mockResolvedValue(1);

      const result = await service.awardXp('guild-internal', 'guild-discord', 'user-1', 20);

      expect(prisma.member.upsert).toHaveBeenCalledWith({
        where: { guildId_userId: { guildId: 'guild-internal', userId: 'user-1' } },
        update: {
          xp: { increment: 20 },
          messages: { increment: 1 },
          lastXpAt: expect.any(Date),
        },
        create: {
          guildId: 'guild-internal',
          userId: 'user-1',
          xp: 20,
          messages: 1,
          level: 0,
          lastXpAt: expect.any(Date),
        },
      });
      expect(result.member.xp).toBe(20);
      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBe(0);
      expect(redis.zadd).toHaveBeenCalledWith('xp:leaderboard:guild-discord', 20, 'user-1');
    });

    it('should detect level-up and update member level', async () => {
      // 100 XP = level 1, member.level is still 0
      const upserted = { id: 'member-1', xp: 100, level: 0, messages: 5 };
      (prisma.member.upsert as jest.Mock).mockResolvedValue(upserted);
      (prisma.member.update as jest.Mock).mockResolvedValue({ ...upserted, level: 1 });
      (redis.zadd as jest.Mock).mockResolvedValue(1);

      const result = await service.awardXp('guild-internal', 'guild-discord', 'user-1', 15);

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(1);
      expect(result.oldLevel).toBe(0);
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: { level: 1 },
      });
    });

    it('should not update level when no level-up occurs', async () => {
      const upserted = { id: 'member-1', xp: 50, level: 0, messages: 3 };
      (prisma.member.upsert as jest.Mock).mockResolvedValue(upserted);
      (redis.zadd as jest.Mock).mockResolvedValue(1);

      const result = await service.awardXp('guild-internal', 'guild-discord', 'user-1', 15);

      expect(result.leveledUp).toBe(false);
      expect(prisma.member.update).not.toHaveBeenCalled();
    });
  });

  describe('getMember', () => {
    it('should return member data', async () => {
      const member = { id: 'member-1', xp: 200, level: 1, messages: 10 };
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(member);

      const result = await service.getMember('guild-internal', 'user-1');

      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: { guildId_userId: { guildId: 'guild-internal', userId: 'user-1' } },
      });
      expect(result).toEqual(member);
    });

    it('should return null when member does not exist', async () => {
      (prisma.member.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getMember('guild-internal', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getRank', () => {
    it('should return 1-indexed rank', async () => {
      (redis.zrevrank as jest.Mock).mockResolvedValue(0);

      const rank = await service.getRank('guild-discord', 'user-1');

      expect(rank).toBe(1);
      expect(redis.zrevrank).toHaveBeenCalledWith('xp:leaderboard:guild-discord', 'user-1');
    });

    it('should return -1 when user is not ranked', async () => {
      (redis.zrevrank as jest.Mock).mockResolvedValue(null);

      const rank = await service.getRank('guild-discord', 'user-1');

      expect(rank).toBe(-1);
    });
  });

  describe('getLeaderboard', () => {
    it('should return entries in correct format', async () => {
      (redis.zrevrange as jest.Mock).mockResolvedValue(['user-1', '500', 'user-2', '300']);

      const entries = await service.getLeaderboard('guild-discord', 1, 10);

      expect(entries).toEqual([
        { userId: 'user-1', xp: 500 },
        { userId: 'user-2', xp: 300 },
      ]);
      expect(redis.zrevrange).toHaveBeenCalledWith(
        'xp:leaderboard:guild-discord',
        0,
        9,
        'WITHSCORES'
      );
    });

    it('should handle pagination correctly', async () => {
      (redis.zrevrange as jest.Mock).mockResolvedValue([]);

      await service.getLeaderboard('guild-discord', 3, 5);

      expect(redis.zrevrange).toHaveBeenCalledWith(
        'xp:leaderboard:guild-discord',
        10,
        14,
        'WITHSCORES'
      );
    });

    it('should return empty array when no results', async () => {
      (redis.zrevrange as jest.Mock).mockResolvedValue([]);

      const entries = await service.getLeaderboard('guild-discord', 1);

      expect(entries).toEqual([]);
    });
  });

  describe('getLeaderboardSize', () => {
    it('should return the count from Redis', async () => {
      (redis.zcard as jest.Mock).mockResolvedValue(42);

      const size = await service.getLeaderboardSize('guild-discord');

      expect(size).toBe(42);
      expect(redis.zcard).toHaveBeenCalledWith('xp:leaderboard:guild-discord');
    });
  });

  describe('setXp', () => {
    it('should set XP and compute the correct level', async () => {
      const member = { id: 'member-1', xp: 500, level: 3 };
      (prisma.member.upsert as jest.Mock).mockResolvedValue(member);
      (redis.zadd as jest.Mock).mockResolvedValue(1);

      const result = await service.setXp('guild-internal', 'guild-discord', 'user-1', 500);

      expect(prisma.member.upsert).toHaveBeenCalledWith({
        where: { guildId_userId: { guildId: 'guild-internal', userId: 'user-1' } },
        update: { xp: 500, level: expect.any(Number) },
        create: { guildId: 'guild-internal', userId: 'user-1', xp: 500, level: expect.any(Number) },
      });
      expect(redis.zadd).toHaveBeenCalledWith('xp:leaderboard:guild-discord', 500, 'user-1');
      expect(result).toEqual(member);
    });
  });

  describe('resetXp', () => {
    it('should reset member data and remove from leaderboard', async () => {
      (prisma.member.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (redis.zrem as jest.Mock).mockResolvedValue(1);

      await service.resetXp('guild-internal', 'guild-discord', 'user-1');

      expect(prisma.member.updateMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-internal', userId: 'user-1' },
        data: { xp: 0, level: 0, messages: 0, lastXpAt: null },
      });
      expect(redis.zrem).toHaveBeenCalledWith('xp:leaderboard:guild-discord', 'user-1');
    });
  });
});
