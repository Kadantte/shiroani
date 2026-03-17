import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, IntegerOption } from 'necord';
import { MessageFlags, PermissionsBitField, TextChannel } from 'discord.js';
import { ModLogService } from './mod-log.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { RequirePermissions, RequireBotPermissions, Cooldown } from '@/common/decorators';
import { successEmbed, errorEmbed } from '@/common/utils';
import { BaseCommand } from '../base';

class ClearOptions {
  @IntegerOption({
    name: 'ilość',
    description: 'Liczba wiadomości do usunięcia (1-100)',
    required: true,
    min_value: 1,
    max_value: 100,
  })
  amount!: number;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class ClearCommand extends BaseCommand {
  constructor(private readonly modLog: ModLogService) {
    super();
  }

  @SlashCommand({
    name: 'clear',
    description: 'Usuń wiadomości z kanału',
  })
  @RequirePermissions(PermissionsBitField.Flags.ManageMessages)
  @RequireBotPermissions(PermissionsBitField.Flags.ManageMessages)
  @Cooldown({ duration: 10, scope: 'channel' })
  async onClear(
    @Context() [interaction]: SlashCommandContext,
    @Options() { amount }: ClearOptions
  ) {
    const channel = interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) {
      return interaction.reply({
        embeds: [errorEmbed('Ta komenda działa tylko na kanałach tekstowych.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    let deleted;
    try {
      deleted = await channel.bulkDelete(amount, true);
    } catch (error) {
      await this.handleError(error, interaction, 'clear');
      return;
    }

    await this.modLog.log({
      guildId: interaction.guildId!,
      action: 'CLEAR_MESSAGES',
      moderatorId: interaction.user.id,
      messagesCleared: deleted.size,
    });

    return interaction.reply({
      embeds: [
        successEmbed(
          `Usunięto **${deleted.size}** wiadomości.${deleted.size < amount ? ` (${amount - deleted.size} pominięto — starsze niż 14 dni)` : ''}`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
