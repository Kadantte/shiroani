import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TextChannel } from 'discord.js';
import { GuildService } from '../guild/guild.service';
import { welcomeEmbed, goodbyeEmbed } from '@/common/utils';

@Injectable()
export class GuildMemberEvent {
  constructor(
    private readonly guildService: GuildService,
    @InjectPinoLogger(GuildMemberEvent.name) private readonly logger: PinoLogger
  ) {}

  @On('guildMemberAdd')
  async onMemberJoin(@Context() [member]: ContextOf<'guildMemberAdd'>) {
    try {
      const guild = await this.guildService.ensureGuild(member.guild.id, member.guild.name);
      if (!guild.welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(guild.welcomeChannelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const embed = welcomeEmbed({
        username: member.user.username,
        avatarUrl: member.user.displayAvatarURL({ size: 256 }),
        memberCount: member.guild.memberCount,
        guildName: member.guild.name,
      });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error({ error, guildId: member.guild.id }, 'Failed to send welcome message');
    }
  }

  @On('guildMemberRemove')
  async onMemberLeave(@Context() [member]: ContextOf<'guildMemberRemove'>) {
    try {
      const guild = await this.guildService.ensureGuild(member.guild.id, member.guild.name);
      if (!guild.goodbyeChannelId) return;

      const channel = member.guild.channels.cache.get(guild.goodbyeChannelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const embed = goodbyeEmbed({
        username: member.user.username,
        avatarUrl: member.user.displayAvatarURL({ size: 256 }),
      });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error({ error, guildId: member.guild.id }, 'Failed to send goodbye message');
    }
  }
}
