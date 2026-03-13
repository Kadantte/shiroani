import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class ReactionRoleEvent {
  private readonly knownMessageIds = new Set<string>();
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(ReactionRoleEvent.name) private readonly logger: PinoLogger
  ) {}

  private ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }

  private async doInit() {
    const mappings = await this.prisma.reactionRole.findMany({
      select: { messageId: true },
      distinct: ['messageId'],
    });
    for (const m of mappings) this.knownMessageIds.add(m.messageId);
  }

  /** Add a message ID to the known set (called from command on rr-add). */
  addKnownMessage(messageId: string) {
    this.knownMessageIds.add(messageId);
  }

  /** Remove a message ID from the known set (called from command on rr-remove when last mapping deleted). */
  removeKnownMessage(messageId: string) {
    this.knownMessageIds.delete(messageId);
  }

  @On('messageReactionAdd')
  async onReactionAdd(@Context() [reaction, user]: ContextOf<'messageReactionAdd'>) {
    await this.handleReaction(reaction, user, 'add');
  }

  @On('messageReactionRemove')
  async onReactionRemove(@Context() [reaction, user]: ContextOf<'messageReactionRemove'>) {
    await this.handleReaction(reaction, user, 'remove');
  }

  private async handleReaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    action: 'add' | 'remove'
  ) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        this.logger.warn({ error }, 'Failed to fetch partial reaction');
        return;
      }
    }

    await this.ensureInitialized();
    if (!this.knownMessageIds.has(reaction.message.id)) return;

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
      if (action === 'add') {
        await member.roles.add(mapping.roleId);
      } else {
        await member.roles.remove(mapping.roleId);
      }
      this.logger.debug(
        { userId: user.id, roleId: mapping.roleId, guildId: guild.id },
        action === 'add' ? 'Added reaction role' : 'Removed reaction role'
      );
    } catch (error) {
      this.logger.error(
        { error, userId: user.id, roleId: mapping.roleId },
        `Failed to ${action} reaction role`
      );
    }
  }
}
