import { SetMetadata } from '@nestjs/common';
import { PermissionsBitField } from 'discord.js';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';
export const REQUIRED_BOT_PERMISSIONS_KEY = 'required_bot_permissions';

export const RequirePermissions = (...permissions: bigint[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const RequireBotPermissions = (...permissions: bigint[]) =>
  SetMetadata(REQUIRED_BOT_PERMISSIONS_KEY, permissions);

// Convenience decorators
export const ModeratorPermissions = () =>
  RequirePermissions(
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.KickMembers
  );

export const AdminPermissions = () => RequirePermissions(PermissionsBitField.Flags.Administrator);
