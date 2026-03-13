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
import { successEmbed, errorEmbed, parseDuration, validateModerationTarget } from '@/common/utils';

class MuteOptions {
  @UserOption({
    name: 'użytkownik',
    description: 'Użytkownik do wyciszenia',
    required: true,
  })
  user!: User;

  @StringOption({
    name: 'czas',
    description: 'Czas trwania (np. 30s, 10m, 2h, 7d)',
    required: true,
  })
  duration!: string;

  @StringOption({
    name: 'powód',
    description: 'Powód wyciszenia',
    required: false,
  })
  reason?: string;
}

class UnmuteOptions {
  @UserOption({
    name: 'użytkownik',
    description: 'Użytkownik do odciszenia',
    required: true,
  })
  user!: User;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class MuteCommand {
  constructor(
    private readonly modLog: ModLogService,
    @InjectPinoLogger(MuteCommand.name) private readonly logger: PinoLogger
  ) {}

  @SlashCommand({
    name: 'mute',
    description: 'Wycisz użytkownika na określony czas',
  })
  @RequirePermissions(PermissionsBitField.Flags.ModerateMembers)
  @RequireBotPermissions(PermissionsBitField.Flags.ModerateMembers)
  @Cooldown({ duration: 5 })
  async onMute(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, duration, reason }: MuteOptions
  ) {
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [errorEmbed('Nie znaleziono użytkownika na serwerze.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const moderator = interaction.member as GuildMember;
    const validationError = validateModerationTarget({
      targetUser: user,
      targetMember: member,
      moderator,
      botMember: interaction.guild!.members.me ?? null,
      action: 'mute',
    });

    if (validationError) {
      return interaction.reply({
        embeds: [errorEmbed(validationError)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60; // 28 days
    const seconds = parseDuration(duration);
    if (!seconds || seconds < 1 || seconds > MAX_TIMEOUT_SECONDS) {
      return interaction.reply({
        embeds: [errorEmbed('Nieprawidłowy czas. Użyj formatu: 30s, 10m, 2h, 7d (max 28d).')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const effectiveReason = reason ?? DEFAULT_REASON;

    try {
      await member.timeout(seconds * 1000, effectiveReason);
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to timeout user');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się wyciszyć użytkownika.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.modLog.log({
      guildId: interaction.guildId!,
      action: 'MUTE',
      targetUserId: user.id,
      moderatorId: interaction.user.id,
      reason: effectiveReason,
      duration: seconds,
    });

    return interaction.reply({
      embeds: [
        successEmbed(
          `**${user.username}** został wyciszony na **${duration}**.${reason ? ` Powód: ${reason}` : ''}`
        ),
      ],
    });
  }

  @SlashCommand({
    name: 'unmute',
    description: 'Odcisz użytkownika',
  })
  @RequirePermissions(PermissionsBitField.Flags.ModerateMembers)
  @RequireBotPermissions(PermissionsBitField.Flags.ModerateMembers)
  @Cooldown({ duration: 5 })
  async onUnmute(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: UnmuteOptions
  ) {
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [errorEmbed('Nie znaleziono użytkownika na serwerze.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        embeds: [errorEmbed('Ten użytkownik nie jest wyciszony.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await member.timeout(null);
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to remove timeout from user');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się odciszyć użytkownika.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.modLog.log({
      guildId: interaction.guildId!,
      action: 'UNMUTE',
      targetUserId: user.id,
      moderatorId: interaction.user.id,
    });

    return interaction.reply({
      embeds: [successEmbed(`**${user.username}** został odciszony.`)],
    });
  }
}
