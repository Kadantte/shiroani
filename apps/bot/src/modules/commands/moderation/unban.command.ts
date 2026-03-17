import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, StringOption } from 'necord';
import { MessageFlags, PermissionsBitField } from 'discord.js';
import { ModLogService } from './mod-log.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { RequirePermissions, RequireBotPermissions, Cooldown } from '@/common/decorators';
import { DEFAULT_REASON } from '@/common/constants';
import { successEmbed, errorEmbed } from '@/common/utils';
import { BaseCommand } from '../base';

class UnbanOptions {
  @StringOption({
    name: 'użytkownik',
    description: 'ID użytkownika do odbanowania',
    required: true,
  })
  userId!: string;

  @StringOption({
    name: 'powód',
    description: 'Powód odbanowania',
    required: false,
  })
  reason?: string;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class UnbanCommand extends BaseCommand {
  constructor(private readonly modLog: ModLogService) {
    super();
  }

  @SlashCommand({
    name: 'unban',
    description: 'Odbanuj użytkownika z serwera',
  })
  @RequirePermissions(PermissionsBitField.Flags.BanMembers)
  @RequireBotPermissions(PermissionsBitField.Flags.BanMembers)
  @Cooldown({ duration: 5 })
  async onUnban(
    @Context() [interaction]: SlashCommandContext,
    @Options() { userId, reason }: UnbanOptions
  ) {
    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        embeds: [errorEmbed('Nieprawidłowe ID użytkownika. Podaj numeryczne ID Discord.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const effectiveReason = reason ?? DEFAULT_REASON;

    try {
      await interaction.guild!.members.unban(userId, effectiveReason);
    } catch (error) {
      await this.handleError(error, interaction, 'unban');
      return;
    }

    await this.modLog.log({
      guildId: interaction.guildId!,
      action: 'UNBAN',
      targetUserId: userId,
      moderatorId: interaction.user.id,
      reason: effectiveReason,
    });

    return interaction.reply({
      embeds: [
        successEmbed(
          `Użytkownik \`${userId}\` został odbanowany.${reason ? ` Powód: ${reason}` : ''}`
        ),
      ],
    });
  }
}
