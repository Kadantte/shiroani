import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class GuildService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(GuildService.name) private readonly logger: PinoLogger
  ) {}

  /**
   * Get or create a guild record. Updates the name on every call.
   */
  async ensureGuild(discordId: string, name: string) {
    return this.prisma.guild.upsert({
      where: { discordId },
      update: { name },
      create: { discordId, name },
    });
  }

  /**
   * Find a guild by Discord ID.
   */
  async findByDiscordId(discordId: string) {
    return this.prisma.guild.findUnique({
      where: { discordId },
    });
  }

  /** Settable guild channel/config fields. */
  static readonly SETTING_FIELDS = [
    'welcomeChannelId',
    'goodbyeChannelId',
    'modLogChannelId',
    'activityChannelId',
    'verifyChannelId',
    'verifyRoleId',
    'verifyMessageId',
  ] as const;

  /**
   * Update a single guild setting field.
   */
  async updateSetting(
    discordId: string,
    field: (typeof GuildService.SETTING_FIELDS)[number],
    value: string | null
  ) {
    await this.prisma.guild.update({
      where: { discordId },
      data: { [field]: value },
    });
  }

  /**
   * Clear channel configuration when bot leaves a guild.
   * Keeps the record for data retention but removes stale channel IDs.
   */
  async clearChannelConfig(discordId: string) {
    const guild = await this.prisma.guild.findUnique({ where: { discordId } });
    if (!guild) return;

    await this.prisma.guild.update({
      where: { discordId },
      data: {
        welcomeChannelId: null,
        goodbyeChannelId: null,
        modLogChannelId: null,
        activityChannelId: null,
        verifyChannelId: null,
        verifyRoleId: null,
        verifyMessageId: null,
      },
    });

    this.logger.info({ discordId }, 'Cleared channel configuration for departed guild');
  }
}
