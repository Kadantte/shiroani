import { GuildMember, User } from 'discord.js';

const ACTION_LABELS = { ban: 'zbanować', mute: 'wyciszyć', unmute: 'odciszyć' } as const;

/**
 * Validate that a moderator can act on a target user.
 * Returns an error message string if validation fails, or null if valid.
 */
export function validateModerationTarget(options: {
  targetUser: User;
  targetMember: GuildMember | null;
  moderator: GuildMember;
  botMember: GuildMember | null;
  action: 'ban' | 'mute' | 'unmute';
}): string | null {
  const { targetUser, targetMember, moderator, botMember, action } = options;

  // Can't act on yourself
  if (targetUser.id === moderator.id) {
    return `Nie możesz ${ACTION_LABELS[action]} samego siebie.`;
  }

  // Can't act on the bot
  if (botMember && targetUser.id === botMember.id) {
    return `Nie mogę ${ACTION_LABELS[action]} samego siebie.`;
  }

  // If member is on the server, check role hierarchy
  if (targetMember) {
    if (targetMember.roles.highest.position >= moderator.roles.highest.position) {
      return `Nie możesz ${ACTION_LABELS[action]} użytkownika z wyższą lub równą rolą.`;
    }

    if (action === 'ban' && !targetMember.bannable) {
      return 'Nie mogę zbanować tego użytkownika. Sprawdź hierarchię ról bota.';
    }
    if (action === 'mute' && !targetMember.moderatable) {
      return 'Nie mogę wyciszyć tego użytkownika.';
    }
  }

  return null;
}
