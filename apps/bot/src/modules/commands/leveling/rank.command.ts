import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, UserOption } from 'necord';
import { Colors, EmbedBuilder, MessageFlags, User } from 'discord.js';
import { XpService } from '@/modules/leveling/xp.service';
import { GuildService } from '@/modules/guild/guild.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { Cooldown } from '@/common/decorators';
import { errorEmbed } from '@/common/utils';

function progressBar(current: number, total: number, length: number = 10): string {
  const filled = Math.round((current / total) * length);
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

class RankOptions {
  @UserOption({
    name: 'użytkownik',
    description: 'Użytkownik do sprawdzenia (domyślnie Ty)',
    required: false,
  })
  user?: User;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class RankCommand {
  constructor(
    private readonly xpService: XpService,
    private readonly guildService: GuildService
  ) {}

  @SlashCommand({
    name: 'rank',
    description: 'Sprawdź swój lub czyjś poziom i XP',
  })
  @Cooldown({ duration: 5 })
  async onRank(@Context() [interaction]: SlashCommandContext, @Options() { user }: RankOptions) {
    const targetUser = user ?? interaction.user;
    const guild = await this.guildService.findByDiscordId(interaction.guildId!);

    if (!guild) {
      return interaction.reply({
        embeds: [errorEmbed('Serwer nie jest skonfigurowany.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const member = await this.xpService.getMember(guild.id, targetUser.id);

    if (!member) {
      return interaction.reply({
        embeds: [errorEmbed(`Brak danych XP dla **${targetUser.username}**.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const level = this.xpService.levelFromXp(member.xp);
    const totalXpForCurrentLevel = this.xpService.totalXpForLevel(level);
    const xpForNextLevel = this.xpService.xpForLevel(level);
    const currentLevelXp = member.xp - totalXpForCurrentLevel;
    const rank = await this.xpService.getRank(interaction.guildId!, targetUser.id);
    const rankDisplay = rank === -1 ? '?' : `#${rank}`;

    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setAuthor({
        name: targetUser.username,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setTitle(`Poziom ${level}`)
      .setDescription(`Pozycja ${rankDisplay} | ${member.messages} wiadomości`)
      .addFields({
        name: 'XP',
        value: `${currentLevelXp}/${xpForNextLevel} ${progressBar(currentLevelXp, xpForNextLevel)}`,
      })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}
