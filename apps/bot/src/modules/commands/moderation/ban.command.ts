import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  UserOption,
  StringOption,
} from 'necord';
import { GuildMember, MessageFlags, PermissionsBitField, User } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ModLogService } from './mod-log.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { RequirePermissions, RequireBotPermissions, Cooldown } from '@/common/decorators';
import { DEFAULT_REASON } from '@/common/constants';
import { successEmbed, errorEmbed, validateModerationTarget } from '@/common/utils';

class BanOptions {
  @UserOption({
    name: 'użytkownik',
    description: 'Użytkownik do zbanowania',
    required: true,
  })
  user!: User;

  @StringOption({
    name: 'powód',
    description: 'Powód bana',
    required: false,
  })
  reason?: string;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class BanCommand {
  constructor(
    private readonly modLog: ModLogService,
    @InjectPinoLogger(BanCommand.name) private readonly logger: PinoLogger
  ) {}

  @SlashCommand({
    name: 'ban',
    description: 'Zbanuj użytkownika z serwera',
  })
  @RequirePermissions(PermissionsBitField.Flags.BanMembers)
  @RequireBotPermissions(PermissionsBitField.Flags.BanMembers)
  @Cooldown({ duration: 5 })
  async onBan(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, reason }: BanOptions
  ) {
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    const moderator = interaction.member as GuildMember;
    const botMember = interaction.guild!.members.me ?? null;

    const validationError = validateModerationTarget({
      targetUser: user,
      targetMember: member,
      moderator,
      botMember,
      action: 'ban',
    });

    if (validationError) {
      return interaction.reply({
        embeds: [errorEmbed(validationError)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const effectiveReason = reason ?? DEFAULT_REASON;

    try {
      await interaction.guild!.members.ban(user.id, {
        reason: effectiveReason,
      });
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to ban user');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się zbanować użytkownika.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.modLog.log({
      guildId: interaction.guildId!,
      action: 'BAN',
      targetUserId: user.id,
      moderatorId: interaction.user.id,
      reason: effectiveReason,
    });

    return interaction.reply({
      embeds: [
        successEmbed(`**${user.username}** został zbanowany.${reason ? ` Powód: ${reason}` : ''}`),
      ],
    });
  }
}
