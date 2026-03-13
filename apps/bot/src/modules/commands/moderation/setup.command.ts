import { Injectable, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext, ChannelOption } from 'necord';
import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
  TextChannel,
} from 'discord.js';
import { GuildService } from '@/modules/guild/guild.service';
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
  constructor(private readonly guildService: GuildService) {}

  @SlashCommand({
    name: 'setup-welcome',
    description: 'Ustaw kanał powitalny',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  async onSetupWelcome(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel }: SetupWelcomeOptions
  ) {
    return this.setupChannel(interaction, 'welcomeChannelId', channel, 'Kanał powitalny');
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
    return this.setupChannel(interaction, 'goodbyeChannelId', channel, 'Kanał pożegnalny');
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
    return this.setupChannel(interaction, 'modLogChannelId', channel, 'Kanał logów moderacji');
  }

  private async setupChannel(
    interaction: ChatInputCommandInteraction,
    field: 'welcomeChannelId' | 'goodbyeChannelId' | 'modLogChannelId',
    channel: TextChannel,
    label: string
  ) {
    await this.guildService.ensureGuild(interaction.guildId!, interaction.guild!.name);
    await this.guildService.updateSetting(interaction.guildId!, field, channel.id);
    return interaction.reply({
      embeds: [successEmbed(`${label} ustawiony na ${channel}.`)],
      flags: MessageFlags.Ephemeral,
    });
  }
}
