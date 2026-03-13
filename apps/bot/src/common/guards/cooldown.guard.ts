import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NecordExecutionContext } from 'necord';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { COOLDOWN_KEY, CooldownOptions } from '@/common/decorators';
import { RedisService } from '@/modules/redis/redis.service';

@Injectable()
export class CooldownGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<CooldownOptions>(COOLDOWN_KEY, context.getHandler());

    if (!options) return true;

    const necordContext = NecordExecutionContext.create(context);
    const [interaction] = necordContext.getContext<'interactionCreate'>();

    if (!interaction.isChatInputCommand()) return true;

    const key = `cooldown:${this.buildKey(interaction, options)}`;
    const ttl = await this.redis.ttl(key);

    if (ttl > 0) {
      await interaction.reply({
        content: `⏳ Poczekaj **${ttl}s** przed ponownym użyciem tej komendy.`,
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    await this.redis.set(key, '1', 'EX', options.duration);
    return true;
  }

  private buildKey(interaction: ChatInputCommandInteraction, options: CooldownOptions): string {
    const command = interaction.commandName;
    const scope = options.scope ?? 'user';
    switch (scope) {
      case 'user':
        return `${command}:user:${interaction.user.id}`;
      case 'guild':
        return `${command}:guild:${interaction.guildId}`;
      case 'channel':
        return `${command}:channel:${interaction.channelId}`;
    }
  }
}
