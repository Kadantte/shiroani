import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as arctic from 'arctic';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { CryptoService } from './crypto.service';
import { UserService, type DiscordUserProfile } from '@/modules/user/user.service';
import { SessionService } from '@/modules/session/session.service';

@Injectable()
export class AuthService {
  private readonly discord: arctic.Discord;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger
  ) {
    this.discord = new arctic.Discord(
      this.config.getOrThrow<string>('DISCORD_CLIENT_ID'),
      this.config.getOrThrow<string>('DISCORD_CLIENT_SECRET'),
      this.config.getOrThrow<string>('DISCORD_REDIRECT_URI')
    );
  }

  /**
   * Create a Discord OAuth authorization URL.
   * Uses `null` for codeVerifier since this is a confidential client.
   */
  createAuthUrl(state: string): string {
    const url = this.discord.createAuthorizationURL(state, null, ['identify']);
    return url.toString();
  }

  /**
   * Exchange an authorization code for Discord OAuth tokens.
   */
  async exchangeCode(code: string) {
    const tokens = await this.discord.validateAuthorizationCode(code, null);
    return {
      accessToken: tokens.accessToken(),
      refreshToken: tokens.refreshToken(),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt(),
    };
  }

  /**
   * Fetch the Discord user profile using an access token.
   */
  async fetchDiscordProfile(accessToken: string): Promise<DiscordUserProfile> {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<DiscordUserProfile>;
  }

  /**
   * Upsert a user from their Discord profile.
   */
  async upsertUser(discordUser: DiscordUserProfile) {
    return this.userService.upsert(discordUser);
  }

  /**
   * Generate JWT access token and refresh token pair.
   * The refresh token is returned as raw bytes (hex) — hash before storing.
   */
  async generateTokens(userId: string, sessionId: string) {
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      sid: sessionId,
    });

    const refreshToken = randomBytes(32).toString('hex');

    return { accessToken, refreshToken };
  }

  /**
   * Hash a refresh token using SHA-256 for storage.
   */
  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  /**
   * Create a new session with a hashed refresh token.
   */
  async createSession(
    userId: string,
    refreshTokenHash: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    return this.sessionService.create(userId, refreshTokenHash, userAgent, ipAddress);
  }

  /**
   * Validate a refresh token by hashing it and finding a matching session.
   */
  async validateRefreshToken(refreshToken: string) {
    const hash = this.hashRefreshToken(refreshToken);
    return this.sessionService.findByRefreshTokenHash(hash);
  }

  /**
   * Rotate the refresh token hash on an existing session (token rotation).
   */
  async rotateSessionRefreshToken(sessionId: string, newHash: string) {
    await this.sessionService.updateRefreshTokenHash(sessionId, newHash);
  }

  /**
   * Revoke a session.
   */
  async revokeSession(sessionId: string) {
    await this.sessionService.revoke(sessionId);
  }

  /**
   * Store an OAuth state parameter in Redis with a 5-minute TTL.
   */
  async storeState(state: string): Promise<void> {
    await this.redis.set(`oauth:state:${state}`, '1', 'EX', 300);
  }

  /**
   * Validate and delete an OAuth state parameter from Redis.
   * Returns true if the state was valid (existed and was deleted).
   */
  async validateAndDeleteState(state: string): Promise<boolean> {
    const result = await this.redis.get(`oauth:state:${state}`);
    if (!result) {
      return false;
    }
    await this.redis.del(`oauth:state:${state}`);
    return true;
  }

  /**
   * Store encrypted Discord tokens for a user.
   */
  async storeDiscordTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
    scopes: string
  ) {
    await this.prisma.discordToken.upsert({
      where: { userId },
      update: {
        accessTokenEncrypted: this.crypto.encrypt(accessToken),
        refreshTokenEncrypted: this.crypto.encrypt(refreshToken),
        expiresAt,
        scopes,
      },
      create: {
        userId,
        accessTokenEncrypted: this.crypto.encrypt(accessToken),
        refreshTokenEncrypted: this.crypto.encrypt(refreshToken),
        expiresAt,
        scopes,
      },
    });

    this.logger.debug({ userId }, 'Stored encrypted Discord tokens');
  }
}
