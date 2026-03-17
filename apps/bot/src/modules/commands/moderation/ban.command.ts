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
import { ModLogService } from './mod-log.service';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { RequirePermissions, RequireBotPermissions, Cooldown } from '@/common/decorators';
import { DEFAULT_REASON } from '@/common/constants';
import { successEmbed, errorEmbed, validateModerationTarget } from '@/common/utils';
import { BaseCommand } from '../base';

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
export class BanCommand extends BaseCommand {
  constructor(private readonly modLog: ModLogService) {
    super();
  }

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
      await this.handleError(error, interaction, 'ban');
      return;
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
