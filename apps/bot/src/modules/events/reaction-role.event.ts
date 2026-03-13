import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class ReactionRoleEvent {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(ReactionRoleEvent.name) private readonly logger: PinoLogger
  ) {}

  @On('messageReactionAdd')
  async onReactionAdd(@Context() [reaction, user]: ContextOf<'messageReactionAdd'>) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        this.logger.warn({ error }, 'Failed to fetch partial reaction');
        return;
      }
    }

    const emoji = reaction.emoji.id ?? reaction.emoji.name;
    if (!emoji) return;

    const mapping = await this.prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId: reaction.message.id, emoji } },
    });

    if (!mapping) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    try {
      await member.roles.add(mapping.roleId);
      this.logger.debug(
        { userId: user.id, roleId: mapping.roleId, guildId: guild.id },
        'Added reaction role'
      );
    } catch (error) {
      this.logger.error(
        { error, userId: user.id, roleId: mapping.roleId },
        'Failed to add reaction role'
      );
    }
  }

  @On('messageReactionRemove')
  async onReactionRemove(@Context() [reaction, user]: ContextOf<'messageReactionRemove'>) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        this.logger.warn({ error }, 'Failed to fetch partial reaction');
        return;
      }
    }

    const emoji = reaction.emoji.id ?? reaction.emoji.name;
    if (!emoji) return;

    const mapping = await this.prisma.reactionRole.findUnique({
      where: { messageId_emoji: { messageId: reaction.message.id, emoji } },
    });

    if (!mapping) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    try {
      await member.roles.remove(mapping.roleId);
      this.logger.debug(
        { userId: user.id, roleId: mapping.roleId, guildId: guild.id },
        'Removed reaction role'
      );
    } catch (error) {
      this.logger.error(
        { error, userId: user.id, roleId: mapping.roleId },
        'Failed to remove reaction role'
      );
    }
  }
}
