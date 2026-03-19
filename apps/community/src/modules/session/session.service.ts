import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectPinoLogger(SessionService.name) private readonly logger: PinoLogger
  ) {}

  async create(userId: string, refreshTokenHash: string, userAgent?: string, ipAddress?: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    this.logger.debug({ sessionId: session.id, userId }, 'Session created');
    return session;
  }

  async findValid(sessionId: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByRefreshTokenHash(hash: string) {
    return this.prisma.session.findFirst({
      where: {
        refreshTokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revoke(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    this.logger.debug({ sessionId }, 'Session revoked');
  }

  async revokeAllForUser(userId: string) {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.info({ userId, count: result.count }, 'All sessions revoked for user');
  }

  async updateLastActive(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  async updateRefreshTokenHash(sessionId: string, newHash: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash: newHash, lastActiveAt: new Date() },
    });
  }
}
