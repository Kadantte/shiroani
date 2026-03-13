import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Client, TextChannel } from 'discord.js';
import { ModerationAction } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { moderationEmbed } from '@/common/utils';

export interface ModLogEntry {
  guildId: string;
  action: ModerationAction;
  targetUserId?: string;
  moderatorId: string;
  reason?: string;
  duration?: number;
  messagesCleared?: number;
}

@Injectable()
export class ModLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: Client,
    @InjectPinoLogger(ModLogService.name) private readonly logger: PinoLogger
  ) {}

  async log(entry: ModLogEntry) {
    this.logger.debug({ entry }, 'ModLogService.log() called');

    // Resolve internal guild ID from Discord guild ID
    const guild = await this.prisma.guild.findUnique({
      where: { discordId: entry.guildId },
    });

    if (!guild) {
      this.logger.warn(
        { guildId: entry.guildId },
        'Guild not found in database — skipping mod log'
      );
      return null;
    }

    this.logger.debug(
      { internalGuildId: guild.id, modLogChannelId: guild.modLogChannelId },
      'Resolved guild from database'
    );

    // Save to database
    const record = await this.prisma.moderationLog.create({
      data: {
        guildId: guild.id,
        action: entry.action,
        targetUserId: entry.targetUserId,
        moderatorId: entry.moderatorId,
        reason: entry.reason,
        duration: entry.duration,
        messagesCleared: entry.messagesCleared,
      },
    });

    this.logger.debug({ recordId: record.id }, 'Moderation log saved to database');

    // Post to mod log channel
    await this.postToChannel(entry, guild.modLogChannelId);

    return record;
  }

  private async postToChannel(entry: ModLogEntry, modLogChannelId: string | null) {
    try {
      if (!modLogChannelId) {
        this.logger.debug(
          { guildId: entry.guildId },
          'No mod log channel configured — skipping channel post'
        );
        return;
      }

      const discordGuild = this.client.guilds.cache.get(entry.guildId);
      if (!discordGuild) {
        this.logger.warn(
          { guildId: entry.guildId, cachedGuilds: this.client.guilds.cache.size },
          'Discord guild not found in cache — cannot post mod log'
        );
        return;
      }

      const channel = discordGuild.channels.cache.get(modLogChannelId);
      if (!channel || !(channel instanceof TextChannel)) {
        this.logger.warn(
          { guildId: entry.guildId, modLogChannelId, channelFound: !!channel },
          'Mod log channel not found in cache or not a text channel'
        );
        return;
      }

      const targetUser = entry.targetUserId
        ? await this.client.users.fetch(entry.targetUserId).catch(() => null)
        : null;
      const moderatorUser = await this.client.users.fetch(entry.moderatorId).catch(() => null);

      const actionLabels: Record<ModerationAction, string> = {
        BAN: 'Ban',
        UNBAN: 'Unban',
        MUTE: 'Wyciszenie',
        UNMUTE: 'Odciszenie',
        CLEAR_MESSAGES: 'Usunięcie wiadomości',
      };

      const isClear = entry.action === 'CLEAR_MESSAGES';

      const embed = moderationEmbed({
        action: actionLabels[entry.action],
        target: isClear
          ? undefined
          : targetUser
            ? `${targetUser.tag} (${entry.targetUserId})`
            : entry.targetUserId,
        moderator: moderatorUser
          ? `${moderatorUser.tag} (${entry.moderatorId})`
          : entry.moderatorId,
        reason: entry.reason,
        duration: entry.duration ? this.formatDuration(entry.duration) : undefined,
        targetAvatarUrl: isClear ? undefined : targetUser?.displayAvatarURL({ size: 256 }),
        moderatorAvatarUrl: moderatorUser?.displayAvatarURL({ size: 256 }),
      });

      if (entry.messagesCleared) {
        embed.addFields({
          name: 'Usunięto wiadomości',
          value: `${entry.messagesCleared}`,
          inline: true,
        });
      }

      await channel.send({ embeds: [embed] });
      this.logger.debug(
        { guildId: entry.guildId, channelId: modLogChannelId },
        'Mod log embed posted to channel'
      );
    } catch (error) {
      this.logger.error({ error, guildId: entry.guildId }, 'Failed to post to mod log channel');
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
}
