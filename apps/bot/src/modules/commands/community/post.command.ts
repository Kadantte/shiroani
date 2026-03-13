import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  Modal,
  ModalContext,
  ModalParam,
  ChannelOption,
  StringOption,
} from 'necord';
import {
  TextChannel,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { CommandGuard } from '@/common/guards';
import { RequirePermissions } from '@/common/decorators';
import { successEmbed, errorEmbed } from '@/common/utils';

const HEX_COLOR_RE = /^#?[\dA-Fa-f]{6}$/;
const DEFAULT_COLOR = 0x5865f2; // Discord blurple

class PostOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał docelowy',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;

  @StringOption({
    name: 'ping',
    description: 'ID roli do pingowania (opcjonalnie)',
    required: false,
  })
  ping?: string;
}

@Injectable()
@UseGuards(CommandGuard)
export class PostCommand {
  @SlashCommand({
    name: 'post',
    description: 'Utwórz i wyślij embed na wybrany kanał',
  })
  @RequirePermissions(PermissionsBitField.Flags.ManageMessages)
  async onPost(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, ping }: PostOptions
  ) {
    const customId = ping ? `post_modal/${channel.id}/${ping}` : `post_modal/${channel.id}`;

    const modal = new ModalBuilder()
      .setCustomId(customId)
      .setTitle('Utwórz embed')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Tytuł')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(256)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Opis')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Kolor (hex, np. #FF5733)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('#5865F2')
            .setMaxLength(7)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('image')
            .setLabel('URL obrazka (opcjonalnie)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(500)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('footer')
            .setLabel('Stopka (opcjonalnie)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(256)
        )
      );

    await interaction.showModal(modal);
  }

  @Modal('post_modal/:channelId{/:ping}')
  async onPostModal(
    @Context() [interaction]: ModalContext,
    @ModalParam('channelId') channelId: string,
    @ModalParam('ping') ping: string | undefined
  ) {
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const color = interaction.fields.getTextInputValue('color');
    const image = interaction.fields.getTextInputValue('image');
    const footer = interaction.fields.getTextInputValue('footer');

    const channel = await interaction.guild?.channels.fetch(channelId).catch(() => null);
    if (!channel || !(channel instanceof TextChannel)) {
      return interaction.reply({
        embeds: [errorEmbed('Nie znaleziono kanału.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setTimestamp();

    if (color && HEX_COLOR_RE.test(color)) {
      const hex = color.startsWith('#') ? color.slice(1) : color;
      embed.setColor(parseInt(hex, 16));
    } else {
      embed.setColor(DEFAULT_COLOR);
    }

    if (image) {
      try {
        const url = new URL(image);
        if (url.protocol === 'https:') {
          embed.setImage(image);
        }
      } catch {
        // Invalid URL — skip silently
      }
    }

    if (footer) {
      embed.setFooter({ text: footer });
    }

    embed.setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ size: 64 }),
    });

    try {
      const content = ping && /^\d{17,20}$/.test(ping) ? `<@&${ping}>` : undefined;
      const message = await channel.send({ content, embeds: [embed] });

      return interaction.reply({
        embeds: [
          successEmbed(`Embed wysłany na ${channel}. [Przejdź do wiadomości](${message.url})`),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      return interaction.reply({
        embeds: [errorEmbed('Nie udało się wysłać embeda. Sprawdź uprawnienia bota.')],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
