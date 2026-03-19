import { useCallback } from 'react';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { useAuthStore } from '@/stores/useAuthStore';

const DISCORD_CDN = 'https://cdn.discordapp.com';

function getAvatarUrl(userId: string, avatarHash: string | null, size = 64): string {
  if (avatarHash) {
    return `${DISCORD_CDN}/avatars/${userId}/${avatarHash}.png?size=${size}`;
  }
  // Default avatar based on user ID
  const index = Number(BigInt(userId) >> 22n) % 6;
  return `${DISCORD_CDN}/embed/avatars/${index}.png?size=${size}`;
}

export function AccountSection() {
  const { isAuthenticated, user, isLoggingIn, error, login, logout } = useAuthStore();

  const handleLogin = useCallback(() => {
    login();
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={User}
        title="Konto"
        subtitle="Połącz konto Discord, aby korzystać z funkcji społecznościowych"
      >
        {isAuthenticated && user ? (
          // Logged in state
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={getAvatarUrl(user.id, user.avatar)}
                alt={user.username}
                className="w-10 h-10 rounded-full ring-2 ring-primary/20"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.globalName ?? user.username}
                </p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Wyloguj
            </Button>
          </div>
        ) : (
          // Logged out state
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Nie zalogowano</p>
              <p className="text-xs text-muted-foreground">
                Zaloguj się przez Discord, aby uzyskać dostęp do watch party i czatu
              </p>
            </div>
            <Button size="sm" onClick={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoggingIn ? 'Logowanie...' : 'Zaloguj przez Discord'}
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </SettingsCard>
    </div>
  );
}
