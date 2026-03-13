import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, ChannelOption } from 'necord';
import { ChannelType, MessageFlags, PermissionsBitField, TextChannel } from 'discord.js';
import { PrismaService } from '../../prisma/prisma.service';
import { CommandGuard } from '@/common/guards';
import { RequirePermissions } from '@/common/decorators';
import { successEmbed } from '@/common/utils';

class SetupWelcomeOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał powitalny',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;
}

class SetupGoodbyeOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał pożegnalny',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;
}

class SetupModLogOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał logów moderacji',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;
}

@Injectable()
@UseGuards(CommandGuard)
export class SetupCommand {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureGuild(discordId: string, name: string) {
    return this.prisma.guild.upsert({
      where: { discordId },
      update: { name },
      create: { discordId, name },
    });
  }

  @SlashCommand({
    name: 'setup-welcome',
    description: 'Ustaw kanał powitalny',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupWelcome(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: SetupWelcomeOptions
  ) {
    const guild = await this.ensureGuild(interaction.guildId!, interaction.guild!.name);
    await this.prisma.guild.update({
      where: { id: guild.id },
      data: { welcomeChannelId: channel.id },
    });

    return interaction.reply({
      embeds: [successEmbed(`Kanał powitalny ustawiony na ${channel}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'setup-goodbye',
    description: 'Ustaw kanał pożegnalny',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupGoodbye(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: SetupGoodbyeOptions
  ) {
    const guild = await this.ensureGuild(interaction.guildId!, interaction.guild!.name);
    await this.prisma.guild.update({
      where: { id: guild.id },
      data: { goodbyeChannelId: channel.id },
    });

    return interaction.reply({
      embeds: [successEmbed(`Kanał pożegnalny ustawiony na ${channel}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'setup-modlog',
    description: 'Ustaw kanał logów moderacji',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupModLog(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: SetupModLogOptions
  ) {
    const guild = await this.ensureGuild(interaction.guildId!, interaction.guild!.name);
    await this.prisma.guild.update({
      where: { id: guild.id },
      data: { modLogChannelId: channel.id },
    });

    return interaction.reply({
      embeds: [successEmbed(`Kanał logów moderacji ustawiony na ${channel}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }
}
