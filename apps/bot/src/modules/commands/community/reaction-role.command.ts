import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  StringOption,
  ChannelOption,
  RoleOption,
} from 'necord';
import {
  ChannelType,
  Colors,
  EmbedBuilder,
  Message,
  MessageFlags,
  PermissionsBitField,
  Role,
  TextChannel,
} from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { GuildService } from '@/modules/guild/guild.service';
import { ReactionRoleEvent } from '@/modules/events/reaction-role.event';
import { CommandGuard, CooldownGuard } from '@/common/guards';
import { RequirePermissions, Cooldown } from '@/common/decorators';
import { successEmbed, errorEmbed, infoEmbed } from '@/common/utils';

class RrCreateOptions {
  @ChannelOption({
    name: 'kanał',
    description: 'Kanał, w którym zostanie wysłany embed',
    required: true,
    channel_types: [ChannelType.GuildText],
  })
  channel!: TextChannel;

  @StringOption({
    name: 'tytuł',
    description: 'Tytuł embeda',
    required: true,
  })
  title!: string;

  @StringOption({
    name: 'opis',
    description: 'Opis embeda',
    required: true,
  })
  description!: string;
}

class RrAddOptions {
  @StringOption({
    name: 'wiadomość',
    description: 'ID wiadomości z embedem',
    required: true,
  })
  messageId!: string;

  @StringOption({
    name: 'emoji',
    description: 'Emoji (unicode lub custom)',
    required: true,
  })
  emoji!: string;

  @RoleOption({
    name: 'rola',
    description: 'Rola do przypisania',
    required: true,
  })
  role!: Role;
}

class RrRemoveOptions {
  @StringOption({
    name: 'wiadomość',
    description: 'ID wiadomości z embedem',
    required: true,
  })
  messageId!: string;

  @StringOption({
    name: 'emoji',
    description: 'Emoji do usunięcia',
    required: true,
  })
  emoji!: string;
}

@Injectable()
@UseGuards(CommandGuard, CooldownGuard)
export class ReactionRoleCommand {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildService: GuildService,
    private readonly reactionRoleEvent: ReactionRoleEvent,
    @InjectPinoLogger(ReactionRoleCommand.name) private readonly logger: PinoLogger
  ) {}

  @SlashCommand({
    name: 'rr-create',
    description: 'Utwórz embed do reakcyjnych ról',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  @Cooldown({ duration: 5 })
  async onRrCreate(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, title, description }: RrCreateOptions
  ) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle(title)
      .setDescription(`${description}\u200B`);

    let sentMessage;
    try {
      sentMessage = await channel.send({ embeds: [embed] });
    } catch {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Nie udało się wysłać wiadomości w wybranym kanale. Sprawdź uprawnienia bota.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      embeds: [
        successEmbed(
          `Embed został utworzony w ${channel}.\nID wiadomości: \`${sentMessage.id}\`\n\nUżyj \`/rr-add\` aby dodać mapowania emoji → rola.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'rr-add',
    description: 'Dodaj mapowanie emoji → rola do embeda',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  @Cooldown({ duration: 3 })
  async onRrAdd(
    @Context() [interaction]: SlashCommandContext,
    @Options() { messageId, emoji, role }: RrAddOptions
  ) {
    const guild = interaction.guild!;
    const resolvedEmoji = this.resolveEmoji(emoji);

    // Find the message across guild text channels
    const message = await this.findMessage(guild, messageId);
    if (!message) {
      return interaction.reply({
        embeds: [errorEmbed('Nie znaleziono wiadomości o podanym ID.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Ensure guild exists in DB
    const dbGuild = await this.guildService.ensureGuild(guild.id, guild.name);

    // Check for duplicate
    const existing = await this.prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId, emoji: resolvedEmoji } },
    });

    if (existing) {
      return interaction.reply({
        embeds: [errorEmbed('To emoji jest już przypisane do roli na tej wiadomości.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Save to DB
    await this.prisma.reactionRole.create({
      data: {
        guildId: dbGuild.id,
        messageId,
        channelId: message.channel.id,
        emoji: resolvedEmoji,
        roleId: role.id,
      },
    });

    this.reactionRoleEvent.addKnownMessage(messageId);

    // React to the message using the resolved emoji (ID for custom, unicode for standard)
    try {
      await message.react(resolvedEmoji);
    } catch (error) {
      this.logger.warn({ error, emoji: resolvedEmoji, messageId }, 'Failed to react to message');
    }

    // Update the embed
    await this.updateEmbed(message, guild);

    return interaction.reply({
      embeds: [successEmbed(`Dodano mapowanie ${emoji} → ${role} na wiadomości \`${messageId}\`.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'rr-remove',
    description: 'Usuń mapowanie emoji → rola z embeda',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  @Cooldown({ duration: 3 })
  async onRrRemove(
    @Context() [interaction]: SlashCommandContext,
    @Options() { messageId, emoji }: RrRemoveOptions
  ) {
    const guild = interaction.guild!;
    const resolvedEmoji = this.resolveEmoji(emoji);

    const mapping = await this.prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId, emoji: resolvedEmoji } },
    });

    if (!mapping) {
      return interaction.reply({
        embeds: [errorEmbed('Nie znaleziono mapowania dla tego emoji na tej wiadomości.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.prisma.reactionRole.delete({
      where: { messageId_emoji: { messageId, emoji: resolvedEmoji } },
    });

    // Remove from cache if no more mappings for this message
    const remaining = await this.prisma.reactionRole.count({ where: { messageId } });
    if (remaining === 0) {
      this.reactionRoleEvent.removeKnownMessage(messageId);
    }

    // Remove bot's reaction from the message
    const message = await this.findMessage(guild, messageId);
    if (message) {
      const botReaction = message.reactions.cache.find(
        r => (r.emoji.id ?? r.emoji.name) === resolvedEmoji
      );
      if (botReaction) {
        try {
          await botReaction.users.remove(guild.client.user!.id);
        } catch (error) {
          this.logger.warn({ error, emoji, messageId }, 'Failed to remove bot reaction');
        }
      }

      await this.updateEmbed(message, guild);
    }

    return interaction.reply({
      embeds: [successEmbed(`Usunięto mapowanie ${emoji} z wiadomości \`${messageId}\`.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @SlashCommand({
    name: 'rr-list',
    description: 'Wyświetl wszystkie reakcyjne role na serwerze',
  })
  @RequirePermissions(PermissionsBitField.Flags.Administrator)
  @Cooldown({ duration: 5 })
  async onRrList(@Context() [interaction]: SlashCommandContext) {
    const guild = interaction.guild!;
    const dbGuild = await this.guildService.findByDiscordId(guild.id);

    if (!dbGuild) {
      return interaction.reply({
        embeds: [infoEmbed('Brak skonfigurowanych reakcyjnych ról na tym serwerze.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const mappings = await this.prisma.reactionRole.findMany({
      where: { guildId: dbGuild.id },
      orderBy: { createdAt: 'asc' },
    });

    if (mappings.length === 0) {
      return interaction.reply({
        embeds: [infoEmbed('Brak skonfigurowanych reakcyjnych ról na tym serwerze.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Group by messageId
    const grouped = new Map<string, typeof mappings>();
    for (const m of mappings) {
      const list = grouped.get(m.messageId) ?? [];
      list.push(m);
      grouped.set(m.messageId, list);
    }

    const lines: string[] = [];
    for (const [msgId, items] of grouped) {
      const channelId = items[0].channelId;
      lines.push(`**Wiadomość** \`${msgId}\` w <#${channelId}>:`);
      for (const item of items) {
        lines.push(`  ${item.emoji} → <@&${item.roleId}>`);
      }
      lines.push('');
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('Reakcyjne role')
      .setDescription(lines.join('\n').trim());

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }

  /**
   * Resolve custom emoji format <:name:id> to just the ID, or return unicode as-is.
   */
  private resolveEmoji(emoji: string): string {
    const customMatch = emoji.match(/<a?:\w+:(\d+)>/);
    return customMatch ? customMatch[1] : emoji;
  }

  /**
   * Find a message by ID across guild text channels.
   * First checks the DB for a known channelId, then falls back to searching.
   */
  private async findMessage(guild: import('discord.js').Guild, messageId: string) {
    // Try known channel from DB first
    const mapping = await this.prisma.reactionRole.findFirst({
      where: { messageId },
      select: { channelId: true },
    });

    if (mapping) {
      try {
        const channel = await guild.channels.fetch(mapping.channelId);
        if (channel?.isTextBased()) {
          return await channel.messages.fetch(messageId);
        }
      } catch {
        // Channel or message may have been deleted, fall through
      }
    }

    // Search text channels
    const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

    for (const [, channel] of channels) {
      try {
        if (channel.isTextBased()) {
          return await channel.messages.fetch(messageId);
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Update the reaction role embed to reflect current mappings.
   */
  private async updateEmbed(message: Message, guild: import('discord.js').Guild) {
    const mappings = await this.prisma.reactionRole.findMany({
      where: { messageId: message.id },
      orderBy: { createdAt: 'asc' },
    });

    const existingEmbed = message.embeds[0];
    if (!existingEmbed) return;

    const mappingLines = mappings.map(m => {
      const role = guild.roles.cache.get(m.roleId);
      const roleName = role ? `${role}` : `<@&${m.roleId}>`;
      return `${m.emoji} → ${roleName}`;
    });

    const embed = EmbedBuilder.from(existingEmbed);

    // Preserve original description (split on zero-width space delimiter) and append mappings
    const originalDesc = existingEmbed.description ?? '';
    const [baseParagraph] = originalDesc.split('\u200B');
    const newDescription =
      mappingLines.length > 0
        ? `${baseParagraph}\u200B\n\n${mappingLines.join('\n')}`
        : baseParagraph;

    embed.setDescription(newDescription);

    try {
      await message.edit({ embeds: [embed] });
    } catch (error) {
      this.logger.warn({ error, messageId: message.id }, 'Failed to update reaction role embed');
    }
  }
}
