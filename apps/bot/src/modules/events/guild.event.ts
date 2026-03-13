import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuildEvent {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(GuildEvent.name) private readonly logger: PinoLogger
  ) {}

  @On('guildCreate')
  async onGuildJoin(@Context() [guild]: ContextOf<'guildCreate'>) {
    await this.prisma.guild.upsert({
      where: { discordId: guild.id },
      update: { name: guild.name },
      create: { discordId: guild.id, name: guild.name },
    });
    this.logger.info({ guildId: guild.id, guildName: guild.name }, 'Joined new guild');
  }

  @On('guildDelete')
  async onGuildLeave(@Context() [guild]: ContextOf<'guildDelete'>) {
    this.logger.info({ guildId: guild.id, guildName: guild.name }, 'Left guild');
  }
}
