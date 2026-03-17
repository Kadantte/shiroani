import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NecordExecutionContext } from 'necord';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { COOLDOWN_KEY, CooldownOptions } from '@/common/decorators';
import { RedisService } from '@/modules/redis/redis.service';

@Injectable()
export class CooldownGuard implements CanActivate {
  private readonly logger = new Logger(CooldownGuard.name);

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

    // If Redis is down, skip cooldown check and allow the command
    if (!this.redis.isReady) {
      this.logger.warn('Redis unavailable — skipping cooldown check');
      return true;
    }

    try {
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
    } catch (error) {
      // Redis command failed — allow the command through rather than crashing
      this.logger.warn(
        `Redis error in cooldown check — allowing command through: ${error instanceof Error ? error.message : String(error)}`
      );
      return true;
    }
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
