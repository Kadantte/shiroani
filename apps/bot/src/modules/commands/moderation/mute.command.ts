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
import { successEmbed, errorEmbed } from '@/common/utils';

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
    const member = interaction.guild!.members.cache.get(user.id);

    if (!member) {
      return interaction.reply({
        embeds: [errorEmbed('Nie znaleziono użytkownika na serwerze.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.id === interaction.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('Nie możesz wyciszyć samego siebie.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const moderator = interaction.member as GuildMember;
    if (member.roles.highest.position >= moderator.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('Nie możesz wyciszyć użytkownika z wyższą lub równą rolą.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        embeds: [errorEmbed('Nie mogę wyciszyć tego użytkownika.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const seconds = this.parseDuration(duration);
    if (!seconds || seconds < 1 || seconds > 2419200) {
      return interaction.reply({
        embeds: [errorEmbed('Nieprawidłowy czas. Użyj formatu: 30s, 10m, 2h, 7d (max 28d).')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await member.timeout(seconds * 1000, reason ?? 'Brak podanego powodu');
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to timeout user');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się wyciszyć użytkownika.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await this.modLog.log({
        guildId: interaction.guildId!,
        action: 'MUTE',
        targetUserId: user.id,
        moderatorId: interaction.user.id,
        reason,
        duration: seconds,
      });
    } catch (error) {
      this.logger.error(
        { error, guildId: interaction.guildId },
        'Failed to create mod log for /mute'
      );
    }

    return interaction.reply({
      embeds: [
        successEmbed(
          `**${user.tag}** został wyciszony na **${duration}**.${reason ? ` Powód: ${reason}` : ''}`
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
    const member = interaction.guild!.members.cache.get(user.id);

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

    try {
      await this.modLog.log({
        guildId: interaction.guildId!,
        action: 'UNMUTE',
        targetUserId: user.id,
        moderatorId: interaction.user.id,
      });
    } catch (error) {
      this.logger.error(
        { error, guildId: interaction.guildId },
        'Failed to create mod log for /unmute'
      );
    }

    return interaction.reply({
      embeds: [successEmbed(`**${user.tag}** został odciszony.`)],
    });
  }

  private parseDuration(input: string): number | null {
    const match = input.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 0);
  }
}
