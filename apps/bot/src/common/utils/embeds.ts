import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from 'discord.js';
import { truncate } from '@shiroani/shared';

export function successEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.Green).setDescription(`✅ ${description}`);
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.Red).setDescription(`❌ ${description}`);
}

export function infoEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.Blue).setDescription(description);
}

export function moderationEmbed(options: {
  action: string;
  target?: string;
  moderator: string;
  reason?: string;
  duration?: string;
  targetAvatarUrl?: string;
  moderatorAvatarUrl?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle(`🔨 ${options.action}`)
    .setTimestamp();

  if (options.moderatorAvatarUrl) {
    embed.setAuthor({ name: options.moderator, iconURL: options.moderatorAvatarUrl });
  }

  // Only show target field when there's a distinct target user
  if (options.target) {
    embed.addFields(
      { name: 'Użytkownik', value: options.target, inline: true },
      { name: 'Moderator', value: options.moderator, inline: true }
    );
    if (options.targetAvatarUrl) {
      embed.setThumbnail(options.targetAvatarUrl);
    }
  } else {
    embed.addFields({ name: 'Moderator', value: options.moderator, inline: true });
    if (options.moderatorAvatarUrl) {
      embed.setThumbnail(options.moderatorAvatarUrl);
    }
  }

  if (options.reason) {
    embed.addFields({ name: 'Powód', value: options.reason });
  }
  if (options.duration) {
    embed.addFields({ name: 'Czas trwania', value: options.duration, inline: true });
  }

  return embed;
}

export function welcomeEmbed(options: {
  username: string;
  avatarUrl: string;
  memberCount: number;
  guildName: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Purple)
    .setTitle(`Witaj na ${options.guildName}! 👋`)
    .setDescription(
      `Cześć **${options.username}**! Jesteś naszym **${options.memberCount}.** członkiem!`
    )
    .setThumbnail(options.avatarUrl)
    .setTimestamp();
}

export function goodbyeEmbed(options: { username: string; avatarUrl: string }): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.DarkGrey)
    .setTitle('Do zobaczenia! 👋')
    .setDescription(`**${options.username}** opuścił(a) serwer.`)
    .setThumbnail(options.avatarUrl)
    .setTimestamp();
}

const FIELD_MAX_LENGTH = 1024;
const UNCACHED_CONTENT = 'Treść niedostępna (wiadomość nie była w cache)';

export function messageDeleteEmbed(options: {
  authorTag: string;
  authorAvatarUrl?: string;
  channelMention: string;
  content: string | null;
  attachmentCount: number;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.DarkRed)
    .setTitle('🗑️ Wiadomość usunięta')
    .setAuthor({
      name: options.authorTag,
      iconURL: options.authorAvatarUrl,
    })
    .addFields(
      { name: 'Kanał', value: options.channelMention, inline: true },
      {
        name: 'Treść',
        value: truncate(options.content ?? UNCACHED_CONTENT, FIELD_MAX_LENGTH),
      }
    )
    .setTimestamp();

  if (options.attachmentCount > 0) {
    embed.addFields({
      name: 'Załączniki',
      value: `${options.attachmentCount}`,
      inline: true,
    });
  }

  return embed;
}

export function messageEditEmbed(options: {
  authorTag: string;
  authorAvatarUrl?: string;
  channelMention: string;
  oldContent: string | null;
  newContent: string;
  messageUrl: string;
}): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
  const embed = new EmbedBuilder()
    .setColor(Colors.Yellow)
    .setTitle('✏️ Wiadomość edytowana')
    .setAuthor({
      name: options.authorTag,
      iconURL: options.authorAvatarUrl,
    })
    .addFields(
      { name: 'Kanał', value: options.channelMention, inline: true },
      {
        name: 'Przed',
        value: truncate(options.oldContent ?? UNCACHED_CONTENT, FIELD_MAX_LENGTH),
      },
      {
        name: 'Po',
        value: truncate(options.newContent, FIELD_MAX_LENGTH),
      }
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Przejdź do wiadomości')
      .setStyle(ButtonStyle.Link)
      .setURL(options.messageUrl)
  );

  return { embed, row };
}
