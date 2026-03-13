import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, StringOption } from 'necord';
import { MessageFlags, PermissionsBitField } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ModLogService } from './mod-log.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { RequirePermissions, RequireBotPermissions, Cooldown } from '@/common/decorators';
import { DEFAULT_REASON } from '@/common/constants';
import { successEmbed, errorEmbed } from '@/common/utils';

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
export class UnbanCommand {
  constructor(
    private readonly modLog: ModLogService,
    @InjectPinoLogger(UnbanCommand.name) private readonly logger: PinoLogger
  ) {}

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
      this.logger.error({ error, userId }, 'Failed to unban user');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się odbanować użytkownika. Sprawdź, czy jest zbanowany.')],
        flags: MessageFlags.Ephemeral,
      });
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
