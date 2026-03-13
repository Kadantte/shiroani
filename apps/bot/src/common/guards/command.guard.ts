import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NecordExecutionContext } from 'necord';
import { GuildMember, MessageFlags } from 'discord.js';
import { REQUIRED_PERMISSIONS_KEY, REQUIRED_BOT_PERMISSIONS_KEY } from '@/common/decorators';

@Injectable()
export class CommandGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const necordContext = NecordExecutionContext.create(context);
    const [interaction] = necordContext.getContext<'interactionCreate'>();

    if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) {
      return true;
    }

    // Must be in a guild
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: '❌ Ta komenda działa tylko na serwerze.',
        flags: MessageFlags.Ephemeral,
      });
      return false;
    }

    const member = interaction.member as GuildMember;

    // Check user permissions
    const requiredPerms = this.reflector.get<bigint[]>(
      REQUIRED_PERMISSIONS_KEY,
      context.getHandler()
    );

    if (requiredPerms?.length) {
      const missing = member.permissions.missing(requiredPerms);
      if (missing.length > 0) {
        await interaction.reply({
          content: `❌ Nie masz wymaganych uprawnień: ${missing.join(', ')}`,
          flags: MessageFlags.Ephemeral,
        });
        return false;
      }
    }

    // Check bot permissions
    const requiredBotPerms = this.reflector.get<bigint[]>(
      REQUIRED_BOT_PERMISSIONS_KEY,
      context.getHandler()
    );

    if (requiredBotPerms?.length) {
      const botMember = interaction.guild.members.me;
      if (botMember) {
        const missing = botMember.permissions.missing(requiredBotPerms);
        if (missing.length > 0) {
          await interaction.reply({
            content: `❌ Bot nie ma wymaganych uprawnień: ${missing.join(', ')}`,
            flags: MessageFlags.Ephemeral,
          });
          return false;
        }
      }
    }

    return true;
  }
}
