import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  BooleanOption,
  ChannelOption,
  IntegerOption,
  RoleOption,
} from 'necord';
import {
  ChannelType,
  Colors,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  Role,
  TextChannel,
} from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Prisma } from '@/generated/prisma/client';
import { GuildService } from '@/modules/guild/guild.service';
import { LevelRoleService } from '@/modules/leveling/level-role.service';
import { CommandGuard } from '@/common/guards';
import { RequirePermissions } from '@/common/decorators';
import { successEmbed, errorEmbed } from '@/common/utils';

class SetupLevelsOptions {
  @BooleanOption({
    name: 'włącz',
    description: 'Włącz lub wyłącz system XP',
    required: true,
  })
  enable!: boolean;
}

class SetupLevelsChannelOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał ogłoszeń awansów',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;
}

class LevelRoleAddOptions {
  @IntegerOption({
    name: 'poziom',
    description: 'Poziom wymagany do otrzymania roli',
    required: true,
    min_value: 1,
  })
  level!: number;

  @RoleOption({
    name: 'rola',
    description: 'Rola do przyznania',
    required: true,
  })
  role!: Role;
}

class LevelRoleRemoveOptions {
  @IntegerOption({
    name: 'poziom',
    description: 'Poziom, z którego usunąć rolę',
    required: true,
    min_value: 1,
  })
  level!: number;
}

@Injectable()
@UseGuards(CommandGuard)
export class SetupLevelsCommand {
  constructor(
    @InjectPinoLogger(SetupLevelsCommand.name) private readonly logger: PinoLogger,
    private readonly guildService: GuildService,
    private readonly levelRoleService: LevelRoleService
  ) {}

  @SlashCommand({
    name: 'setup-levels',
    description: 'Włącz lub wyłącz system XP',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupLevels(
    @Context() [interaction]: SlashCommandContext,
    @Options() { enable }: SetupLevelsOptions
  ) {
    await this.guildService.ensureGuild(interaction.guildId!, interaction.guild!.name);
    await this.guildService.updateXpEnabled(interaction.guildId!, enable);

    const status = enable ? 'włączony' : 'wyłączony';
    return interaction.reply({
      embeds: [successEmbed(`System XP został ${status}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'setup-levels-channel',
    description: 'Ustaw kanał ogłoszeń awansów',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupLevelsChannel(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: SetupLevelsChannelOptions
  ) {
    await this.guildService.ensureGuild(interaction.guildId!, interaction.guild!.name);
    await this.guildService.updateSetting(interaction.guildId!, 'levelUpChannelId', channel.id);

    return interaction.reply({
      embeds: [successEmbed(`Kanał awansów ustawiony na ${channel}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'levelrole-add',
    description: 'Dodaj rolę za osiągnięcie poziomu',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onLevelRoleAdd(
    @Context() [interaction]: SlashCommandContext,
    @Options() { level, role }: LevelRoleAddOptions
  ) {
    const guild = await this.guildService.ensureGuild(
      interaction.guildId!,
      interaction.guild!.name
    );

    try {
      await this.levelRoleService.addLevelRole(guild.id, level, role.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return interaction.reply({
          embeds: [errorEmbed(`Rola na poziom ${level} już istnieje.`)],
          flags: MessageFlags.Ephemeral,
        });
      }
      this.logger.error({ error, level }, 'Failed to add level role');
      return interaction.reply({
        embeds: [errorEmbed('Wystąpił błąd podczas dodawania roli.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      embeds: [successEmbed(`Rola ${role} zostanie przyznana na poziomie **${level}**.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'levelrole-remove',
    description: 'Usuń rolę za osiągnięcie poziomu',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onLevelRoleRemove(
    @Context() [interaction]: SlashCommandContext,
    @Options() { level }: LevelRoleRemoveOptions
  ) {
    const guild = await this.guildService.ensureGuild(
      interaction.guildId!,
      interaction.guild!.name
    );

    try {
      await this.levelRoleService.removeLevelRole(guild.id, level);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return interaction.reply({
          embeds: [errorEmbed(`Nie znaleziono roli na poziom ${level}.`)],
          flags: MessageFlags.Ephemeral,
        });
      }
      this.logger.error({ error, level }, 'Failed to remove level role');
      return interaction.reply({
        embeds: [errorEmbed('Wystąpił błąd podczas usuwania roli.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      embeds: [successEmbed(`Rola za poziom **${level}** została usunięta.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'levelrole-list',
    description: 'Wyświetl listę ról za poziomy',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onLevelRoleList(@Context() [interaction]: SlashCommandContext) {
    const guild = await this.guildService.findByDiscordId(interaction.guildId!);

    if (!guild) {
      return interaction.reply({
        embeds: [errorEmbed('Serwer nie jest skonfigurowany.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const roles = await this.levelRoleService.getLevelRoles(guild.id);

    if (roles.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed('Brak skonfigurowanych ról za poziomy.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = roles.map(r => `Poziom **${r.level}** \u2192 <@&${r.roleId}>`);

    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('Role za poziomy')
      .setDescription(lines.join('\n'))
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}
