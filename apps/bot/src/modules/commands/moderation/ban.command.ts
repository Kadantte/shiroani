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
    const member = interaction.guild!.members.cache.get(user.id);

    if (user.id === interaction.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('Nie możesz zbanować samego siebie.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.id === interaction.client.user!.id) {
      return interaction.reply({
        embeds: [errorEmbed('Nie mogę zbanować samego siebie.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (member) {
      const moderator = interaction.member as GuildMember;
      if (member.roles.highest.position >= moderator.roles.highest.position) {
        return interaction.reply({
          embeds: [errorEmbed('Nie możesz zbanować użytkownika z wyższą lub równą rolą.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          embeds: [errorEmbed('Nie mogę zbanować tego użytkownika. Sprawdź hierarchię ról bota.')],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    try {
      await interaction.guild!.members.ban(user.id, {
        reason: reason ?? 'Brak podanego powodu',
      });
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to ban user');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się zbanować użytkownika.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await this.modLog.log({
        guildId: interaction.guildId!,
        action: 'BAN',
        targetUserId: user.id,
        moderatorId: interaction.user.id,
        reason,
      });
    } catch (error) {
      this.logger.error(
        { error, guildId: interaction.guildId },
        'Failed to create mod log for /ban'
      );
    }

    return interaction.reply({
      embeds: [
        successEmbed(`**${user.tag}** został zbanowany.${reason ? ` Powód: ${reason}` : ''}`),
      ],
    });
  }
}
