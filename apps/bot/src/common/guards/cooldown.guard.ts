import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NecordExecutionContext } from 'necord';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { COOLDOWN_KEY, CooldownOptions } from '../decorators';

@Injectable()
export class CooldownGuard implements CanActivate {
  /** Map<scope_key, expiry_timestamp> */
  private readonly cooldowns = new Map<string, number>();

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<CooldownOptions>(COOLDOWN_KEY, context.getHandler());

    if (!options) return true;

    const necordContext = NecordExecutionContext.create(context);
    const [interaction] = necordContext.getContext<'interactionCreate'>();

    if (!interaction.isChatInputCommand()) return true;

    const key = this.buildKey(interaction, options);
    const now = Date.now();
    const expiry = this.cooldowns.get(key);

    if (expiry && now < expiry) {
      const remaining = Math.ceil((expiry - now) / 1000);
      await interaction.reply({
        content: `⏳ Poczekaj **${remaining}s** przed ponownym użyciem tej komendy.`,
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    this.cooldowns.set(key, now + options.duration * 1000);

    // Cleanup old entries periodically (1 in 20 chance)
    if (Math.random() < 0.05) {
      this.cleanup(now);
    }

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

  private cleanup(now: number) {
    for (const [key, expiry] of this.cooldowns) {
      if (now >= expiry) this.cooldowns.delete(key);
    }
  }
}
