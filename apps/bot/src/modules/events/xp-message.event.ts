import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { Guild as DiscordGuild, TextChannel } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GuildService } from '@/modules/guild/guild.service';
import { XpService } from '@/modules/leveling/xp.service';
import { LevelRoleService } from '@/modules/leveling/level-role.service';

@Injectable()
export class XpMessageEvent {
  constructor(
    private readonly guildService: GuildService,
    private readonly xpService: XpService,
    private readonly levelRoleService: LevelRoleService,
    @InjectPinoLogger(XpMessageEvent.name) private readonly logger: PinoLogger
  ) {}

  @On('messageCreate')
  async onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.content) return;

    const guild = await this.guildService.findByDiscordId(message.guild.id);
    if (!guild?.xpEnabled) return;

    if (await this.xpService.isOnCooldown(guild.discordId, message.author.id)) {
      return;
    }

    await this.xpService.setCooldown(guild.discordId, message.author.id, guild.xpCooldown);

    const amount = this.xpService.randomXpAmount(guild.xpMinAmount, guild.xpMaxAmount);
    const result = await this.xpService.awardXp(
      guild.id,
      guild.discordId,
      message.author.id,
      amount
    );

    if (result.leveledUp) {
      await this.applyLevelRoles(message.guild, message.author.id, guild.id, result.newLevel);

      if (guild.levelUpChannelId) {
        await this.sendLevelUpMessage(
          message.guild,
          guild.levelUpChannelId,
          message.author.id,
          result.newLevel
        );
      }
    }
  }

  private async applyLevelRoles(
    discordGuild: DiscordGuild,
    userId: string,
    guildInternalId: string,
    level: number
  ) {
    try {
      const levelRoles = await this.levelRoleService.getRolesForLevel(guildInternalId, level);
      if (levelRoles.length === 0) return;

      const member = await discordGuild.members.fetch(userId).catch(() => null);
      if (!member) return;

      for (const lr of levelRoles) {
        if (!member.roles.cache.has(lr.roleId)) {
          await member.roles.add(lr.roleId).catch((err: unknown) => {
            this.logger.warn({ err, roleId: lr.roleId, userId }, 'Failed to add level role');
          });
        }
      }
    } catch (error) {
      this.logger.error({ error, userId, level }, 'Failed to apply level roles');
    }
  }

  private async sendLevelUpMessage(
    discordGuild: DiscordGuild,
    channelId: string,
    userId: string,
    level: number
  ) {
    try {
      const channel = discordGuild.channels.cache.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      await channel.send({
        content: `\u{1F389} <@${userId}> awansowa\u0142(a) na **poziom ${level}**!`,
      });
    } catch (error) {
      this.logger.error({ error, userId, level }, 'Failed to send level-up message');
    }
  }
}
