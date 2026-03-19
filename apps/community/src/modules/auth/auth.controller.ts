import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { User } from '@/generated/prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectPinoLogger(AuthController.name) private readonly logger: PinoLogger
  ) {}

  @Public()
  @Get('discord')
  async discordAuth() {
    const state = randomBytes(32).toString('hex');
    await this.authService.storeState(state);

    const url = this.authService.createAuthUrl(state);

    return { url };
  }

  @Public()
  @Get('discord/callback')
  async discordCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: { headers: { 'user-agent'?: string }; ip?: string }
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter');
    }

    // Validate and consume the state parameter
    const isValidState = await this.authService.validateAndDeleteState(state);
    if (!isValidState) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    // Exchange the authorization code for Discord tokens
    let discordTokens;
    try {
      discordTokens = await this.authService.exchangeCode(code);
    } catch (err) {
      this.logger.error({ err }, 'Failed to exchange Discord authorization code');
      throw new UnauthorizedException('Failed to exchange authorization code');
    }

    // Fetch the Discord user profile
    let discordUser;
    try {
      discordUser = await this.authService.fetchDiscordProfile(discordTokens.accessToken);
    } catch (err) {
      this.logger.error({ err }, 'Failed to fetch Discord user profile');
      throw new UnauthorizedException('Failed to fetch Discord profile');
    }

    // Upsert the user in our database
    const user = await this.authService.upsertUser(discordUser);

    // Store encrypted Discord tokens
    await this.authService.storeDiscordTokens(
      user.id,
      discordTokens.accessToken,
      discordTokens.refreshToken,
      discordTokens.accessTokenExpiresAt,
      'identify'
    );

    // Generate JWT + refresh token
    const refreshTokenRaw = randomBytes(32).toString('hex');
    const refreshTokenHash = this.authService.hashRefreshToken(refreshTokenRaw);

    // Create session
    const session = await this.authService.createSession(
      user.id,
      refreshTokenHash,
      req.headers['user-agent'],
      req.ip
    );

    // Generate JWT access token
    const { accessToken } = await this.authService.generateTokens(user.id, session.id);

    this.logger.info(
      { userId: user.id, discordId: user.discordId },
      'User authenticated via Discord'
    );

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        globalName: user.globalName,
        avatar: user.avatar,
      },
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Missing refresh token');
    }

    // Validate the refresh token against stored session
    const session = await this.authService.validateRefreshToken(body.refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new JWT with the same session ID
    const { accessToken, refreshToken: newRefreshToken } = await this.authService.generateTokens(
      session.userId,
      session.id
    );

    // Rotate: update the session with the new refresh token hash
    const newHash = this.authService.hashRefreshToken(newRefreshToken);
    await this.authService.rotateSessionRefreshToken(session.id, newHash);

    this.logger.debug({ userId: session.userId }, 'Token refreshed');

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: User, @Req() req: { sessionId: string }) {
    await this.authService.revokeSession(req.sessionId);

    this.logger.info({ userId: user.id }, 'User logged out');

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      banner: user.banner,
      accentColor: user.accentColor,
      createdAt: user.createdAt,
    };
  }
}
