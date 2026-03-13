import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  Button,
  ButtonContext,
  ChannelOption,
  RoleOption,
  StringOption,
} from 'necord';
import {
  TextChannel,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  Colors,
  Role,
  GuildMember,
} from 'discord.js';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildService } from '../../guild/guild.service';
import { CommandGuard } from '@/common/guards';
import { RequirePermissions } from '@/common/decorators';
import { successEmbed, errorEmbed } from '@/common/utils';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

class SetupVerifyOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał weryfikacji',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;

  @RoleOption({
    name: 'rola',
    description: 'Rola nadawana po weryfikacji',
    required: true,
  })
  role!: Role;

  @StringOption({
    name: 'zasady',
    description: 'Tekst zasad wyświetlany nad przyciskiem',
    required: false,
  })
  rules?: string;
}

@Injectable()
@UseGuards(CommandGuard)
export class VerifyCommand {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildService: GuildService,
    @InjectPinoLogger(VerifyCommand.name) private readonly logger: PinoLogger
  ) {}

  @SlashCommand({
    name: 'setup-verify',
    description: 'Ustaw system weryfikacji z przyciskiem',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupVerify(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, role, rules }: SetupVerifyOptions
  ) {
    const guild = await this.guildService.ensureGuild(
      interaction.guildId!,
      interaction.guild!.name
    );

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('✅ Weryfikacja')
      .setDescription(rules ?? 'Kliknij przycisk poniżej, aby zweryfikować się na serwerze.')
      .setFooter({
        text: interaction.guild!.name,
        iconURL: interaction.guild!.iconURL() ?? undefined,
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('Zweryfikuj się')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    const message = await channel.send({ embeds: [embed], components: [row] });

    await this.prisma.guild.update({
      where: { id: guild.id },
      data: {
        verifyChannelId: channel.id,
        verifyRoleId: role.id,
        verifyMessageId: message.id,
      },
    });

    return interaction.reply({
      embeds: [successEmbed(`System weryfikacji ustawiony na ${channel} z rolą ${role}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @Button('verify_button')
  async onVerifyButton(@Context() [interaction]: ButtonContext) {
    if (!interaction.guild || !interaction.member) {
      return interaction.reply({
        embeds: [errorEmbed('Ta funkcja działa tylko na serwerze.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const guild = await this.guildService.findByDiscordId(interaction.guildId!);
    if (!guild?.verifyRoleId) {
      return interaction.reply({
        embeds: [errorEmbed('System weryfikacji nie jest skonfigurowany.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const member = interaction.member as GuildMember;

    if (member.roles.cache.has(guild.verifyRoleId)) {
      return interaction.reply({
        embeds: [successEmbed('Jesteś już zweryfikowany(a)!')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await member.roles.add(guild.verifyRoleId);

      this.logger.info(
        { userId: interaction.user.id, guildId: interaction.guildId },
        'User verified'
      );

      return interaction.reply({
        embeds: [successEmbed('Zostałeś zweryfikowany(a)! ✅')],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      this.logger.error({ error, userId: interaction.user.id }, 'Failed to add verify role');
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się nadać roli. Sprawdź uprawnienia bota.')],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
