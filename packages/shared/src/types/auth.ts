export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  avatar: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: DiscordUser | null;
  expiresAt: number | null;
}
