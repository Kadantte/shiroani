import { Injectable } from '@nestjs/common';
import { Context, On, ContextOf } from 'necord';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GuildService } from '@/modules/guild/guild.service';

@Injectable()
export class GuildEvent {
  constructor(
    private readonly guildService: GuildService,
    @InjectPinoLogger(GuildEvent.name) private readonly logger: PinoLogger
  ) {}

  @On('guildCreate')
  async onGuildJoin(@Context() [guild]: ContextOf<'guildCreate'>) {
    await this.guildService.ensureGuild(guild.id, guild.name);
    this.logger.info({ guildId: guild.id, guildName: guild.name }, 'Joined new guild');
  }

  @On('guildDelete')
  async onGuildLeave(@Context() [guild]: ContextOf<'guildDelete'>) {
    await this.guildService.clearChannelConfig(guild.id);
    this.logger.info({ guildId: guild.id, guildName: guild.name }, 'Left guild');
  }
}
