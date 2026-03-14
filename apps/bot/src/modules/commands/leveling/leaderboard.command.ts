import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  IntegerOption,
  Button,
  ButtonContext,
} from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { XpService } from '@/modules/leveling/xp.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { Cooldown } from '@/common/decorators';
import { errorEmbed } from '@/common/utils';

const PER_PAGE = 10;

class LeaderboardOptions {
  @IntegerOption({
    name: 'strona',
    description: 'Numer strony (domyślnie 1)',
    required: false,
    min_value: 1,
  })
  page?: number;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class LeaderboardCommand {
  constructor(private readonly xpService: XpService) {}

  @SlashCommand({
    name: 'leaderboard',
    description: 'Pokaż ranking XP na serwerze',
  })
  @Cooldown({ duration: 10 })
  async onLeaderboard(
    @Context() [interaction]: SlashCommandContext,
    @Options() { page }: LeaderboardOptions
  ) {
    const currentPage = page ?? 1;
    const result = await this.buildLeaderboard(
      interaction.guildId!,
      interaction.client,
      currentPage
    );

    if ('error' in result) {
      return interaction.reply({
        embeds: [errorEmbed(result.error)],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      embeds: [result.embed],
      components: result.row ? [result.row] : [],
    });
  }

  @Button('leaderboard:prev/:page')
  async onPrev(@Context() [interaction]: ButtonContext) {
    return this.handlePageButton(interaction);
  }

  @Button('leaderboard:next/:page')
  async onNext(@Context() [interaction]: ButtonContext) {
    return this.handlePageButton(interaction);
  }

  private async handlePageButton(interaction: ButtonContext[0]) {
    const page = parseInt(interaction.customId.split(':')[2], 10);

    if (isNaN(page) || page < 1) {
      return interaction.update({ content: 'Nieprawidłowa strona.', embeds: [], components: [] });
    }

    const result = await this.buildLeaderboard(interaction.guildId!, interaction.client, page);

    if ('error' in result) {
      return interaction.update({
        embeds: [errorEmbed(result.error)],
        components: [],
      });
    }

    return interaction.update({
      embeds: [result.embed],
      components: result.row ? [result.row] : [],
    });
  }

  private async buildLeaderboard(
    guildDiscordId: string,
    client: { users: { fetch: (id: string) => Promise<{ id: string; username: string }> } },
    page: number
  ): Promise<
    { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> | null } | { error: string }
  > {
    const totalMembers = await this.xpService.getLeaderboardSize(guildDiscordId);

    if (totalMembers === 0) {
      return { error: 'Ranking jest pusty. Nikt jeszcze nie zdobył XP.' };
    }

    const totalPages = Math.ceil(totalMembers / PER_PAGE);

    if (page > totalPages) {
      return { error: `Strona ${page} nie istnieje. Ostatnia strona: ${totalPages}.` };
    }

    const entries = await this.xpService.getLeaderboard(guildDiscordId, page, PER_PAGE);
    const startRank = (page - 1) * PER_PAGE + 1;

    const users = await Promise.all(
      entries.map(e => client.users.fetch(e.userId).catch(() => null))
    );
    const userMap = new Map(
      users.filter((u): u is NonNullable<typeof u> => u !== null).map(u => [u.id, u])
    );

    const lines: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const level = this.xpService.levelFromXp(entry.xp);
      const user = userMap.get(entry.userId);
      const username = user?.username ?? `<@${entry.userId}>`;
      lines.push(`**#${startRank + i}** ${username} \u2014 Poziom ${level} (${entry.xp} XP)`);
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Gold)
      .setTitle('\uD83C\uDFC6 Ranking XP')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Strona ${page}/${totalPages}` })
      .setTimestamp();

    let row: ActionRowBuilder<ButtonBuilder> | null = null;

    if (totalPages > 1) {
      const buttons: ButtonBuilder[] = [];

      if (page > 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`leaderboard:prev:${page - 1}`)
            .setLabel('Poprzednia')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (page < totalPages) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`leaderboard:next:${page + 1}`)
            .setLabel('Następna')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      if (buttons.length > 0) {
        row = new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
      }
    }

    return { embed, row };
  }
}
