import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';

@Injectable()
export class XpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  /** MEE6-style XP formula: 5*(level^2) + 50*level + 100 */
  xpForLevel(level: number): number {
    return 5 * (level * level) + 50 * level + 100;
  }

  /** Total XP needed to reach a given level (cumulative, closed-form) */
  totalXpForLevel(level: number): number {
    if (level <= 0) return 0;
    const L = level;
    return Math.floor((5 * (L - 1) * L * (2 * L - 1)) / 6 + (50 * (L - 1) * L) / 2 + 100 * L);
  }

  /** Calculate level from total XP */
  levelFromXp(xp: number): number {
    let level = 0;
    let remaining = xp;
    while (remaining >= this.xpForLevel(level)) {
      remaining -= this.xpForLevel(level);
      level++;
    }
    return level;
  }

  /** Check if user is on cooldown (returns true if on cooldown) */
  async isOnCooldown(guildId: string, userId: string): Promise<boolean> {
    const key = `xp:cooldown:${guildId}:${userId}`;
    const ttl = await this.redis.ttl(key);
    return ttl > 0;
  }

  /** Set cooldown for user */
  async setCooldown(guildId: string, userId: string, cooldownSeconds: number): Promise<void> {
    const key = `xp:cooldown:${guildId}:${userId}`;
    await this.redis.set(key, '1', 'EX', cooldownSeconds);
  }

  /** Award XP to a member. Returns member data and level-up info. */
  async awardXp(
    guildInternalId: string,
    guildDiscordId: string,
    userId: string,
    amount: number
  ): Promise<{
    member: { xp: number; level: number; messages: number };
    leveledUp: boolean;
    newLevel: number;
    oldLevel: number;
  }> {
    const result = await this.prisma.$transaction(async tx => {
      const member = await tx.member.upsert({
        where: { guildId_userId: { guildId: guildInternalId, userId } },
        update: {
          xp: { increment: amount },
          messages: { increment: 1 },
          lastXpAt: new Date(),
        },
        create: {
          guildId: guildInternalId,
          userId,
          xp: amount,
          messages: 1,
          level: 0,
          lastXpAt: new Date(),
        },
      });

      const newLevel = this.levelFromXp(member.xp);
      const leveledUp = newLevel > member.level;
      const oldLevel = member.level;

      if (leveledUp) {
        await tx.member.update({
          where: { id: member.id },
          data: { level: newLevel },
        });
      }

      return { member, leveledUp, newLevel, oldLevel };
    });

    // Update Redis leaderboard (best-effort, outside transaction)
    await this.redis.zadd(`xp:leaderboard:${guildDiscordId}`, result.member.xp, userId);

    return {
      member: { xp: result.member.xp, level: result.newLevel, messages: result.member.messages },
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      oldLevel: result.oldLevel,
    };
  }

  /** Get member XP data */
  async getMember(guildInternalId: string, userId: string) {
    return this.prisma.member.findUnique({
      where: { guildId_userId: { guildId: guildInternalId, userId } },
    });
  }

  /** Get rank of a user in a guild (1-indexed, -1 if not found) */
  async getRank(guildDiscordId: string, userId: string): Promise<number> {
    const rank = await this.redis.zrevrank(`xp:leaderboard:${guildDiscordId}`, userId);
    if (rank === null) return -1;
    return rank + 1;
  }

  /** Get top N members from leaderboard */
  async getLeaderboard(
    guildDiscordId: string,
    page: number,
    perPage: number = 10
  ): Promise<{ userId: string; xp: number }[]> {
    const start = (page - 1) * perPage;
    const stop = start + perPage - 1;
    const results = await this.redis.zrevrange(
      `xp:leaderboard:${guildDiscordId}`,
      start,
      stop,
      'WITHSCORES'
    );

    const entries: { userId: string; xp: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({ userId: results[i], xp: parseInt(results[i + 1], 10) });
    }
    return entries;
  }

  /** Get total member count for a guild leaderboard */
  async getLeaderboardSize(guildDiscordId: string): Promise<number> {
    return this.redis.zcard(`xp:leaderboard:${guildDiscordId}`);
  }

  /** Generate random XP amount between min and max (inclusive) */
  randomXpAmount(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Set XP for a user (admin command) */
  async setXp(guildInternalId: string, guildDiscordId: string, userId: string, xp: number) {
    const level = this.levelFromXp(xp);
    const member = await this.prisma.member.upsert({
      where: { guildId_userId: { guildId: guildInternalId, userId } },
      update: { xp, level },
      create: { guildId: guildInternalId, userId, xp, level },
    });
    await this.redis.zadd(`xp:leaderboard:${guildDiscordId}`, xp, userId);
    return member;
  }

  /** Reset XP for a user */
  async resetXp(guildInternalId: string, guildDiscordId: string, userId: string) {
    await this.prisma.member.updateMany({
      where: { guildId: guildInternalId, userId },
      data: { xp: 0, level: 0, messages: 0, lastXpAt: null },
    });
    await this.redis.zrem(`xp:leaderboard:${guildDiscordId}`, userId);
  }
}
