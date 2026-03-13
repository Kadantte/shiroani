import { SetMetadata } from '@nestjs/common';

export interface CooldownOptions {
  /** Cooldown duration in seconds */
  duration: number;
  /** Scope of the cooldown */
  scope?: 'user' | 'guild' | 'channel';
}

export const COOLDOWN_KEY = 'cooldown';

export const Cooldown = (options: CooldownOptions) => SetMetadata(COOLDOWN_KEY, options);
