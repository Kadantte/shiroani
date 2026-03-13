import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TextChannel } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service';
import { messageDeleteEmbed, messageEditEmbed } from '@/common/utils';

@Injectable()
export class MessageAuditEvent {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(MessageAuditEvent.name) private readonly logger: PinoLogger
  ) {}

  @On('messageDelete')
  async onMessageDelete(@Context() [message]: ContextOf<'messageDelete'>) {
    try {
      // Skip if no guild (DMs)
      if (!message.guild) return;

      // Skip bot messages
      if (message.author?.bot) return;

      // Skip messages with no content (embeds-only, system messages, uncached with no info)
      const content = message.content ?? null;
      const hasContent = content !== null && content.length > 0;
      const hasAttachments = (message.attachments?.size ?? 0) > 0;

      // Skip if no useful content (no text, no attachments — covers both partial and embed-only)
      if (!hasContent && !hasAttachments) return;

      const guild = await this.prisma.guild.findUnique({
        where: { discordId: message.guild.id },
      });

      if (!guild?.modLogChannelId) return;

      // Don't log deletions from the mod log channel itself
      if (message.channelId === guild.modLogChannelId) return;

      const channel = message.guild.channels.cache.get(guild.modLogChannelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const embed = messageDeleteEmbed({
        authorTag: message.author?.tag ?? 'Nieznany użytkownik',
        authorAvatarUrl: message.author?.displayAvatarURL({ size: 256 }),
        channelMention: `<#${message.channelId}>`,
        content,
        attachmentCount: message.attachments?.size ?? 0,
      });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error({ error, messageId: message.id }, 'Failed to log deleted message');
    }
  }

  @On('messageUpdate')
  async onMessageUpdate(@Context() [oldMessage, newMessage]: ContextOf<'messageUpdate'>) {
    try {
      // Skip if no guild (DMs)
      if (!newMessage.guild) return;

      // Skip bot messages
      if (newMessage.author?.bot) return;

      // Skip if content didn't change (embed updates, link previews)
      const oldContent = oldMessage.content ?? null;
      const newContent = newMessage.content ?? null;
      if (newContent === null) return;
      if (oldContent === newContent) return;

      const guild = await this.prisma.guild.findUnique({
        where: { discordId: newMessage.guild.id },
      });

      if (!guild?.modLogChannelId) return;

      // Don't log edits in the mod log channel itself
      if (newMessage.channelId === guild.modLogChannelId) return;

      const channel = newMessage.guild.channels.cache.get(guild.modLogChannelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const { embed, row } = messageEditEmbed({
        authorTag: newMessage.author?.tag ?? 'Nieznany użytkownik',
        authorAvatarUrl: newMessage.author?.displayAvatarURL({ size: 256 }),
        channelMention: `<#${newMessage.channelId}>`,
        oldContent,
        newContent,
        messageUrl: newMessage.url,
      });

      await channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      this.logger.error({ error, messageId: newMessage.id }, 'Failed to log edited message');
    }
  }
}
