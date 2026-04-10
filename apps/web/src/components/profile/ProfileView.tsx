import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useProfileStore, startProfileRefresh } from '@/stores/useProfileStore';
import { ProfileSetup } from './ProfileSetup';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProfileDashboard } from './ProfileDashboard';

export function ProfileView() {
  const username = useProfileStore(s => s.username);
  const profile = useProfileStore(s => s.profile);
  const isLoading = useProfileStore(s => s.isLoading);
  const initFromStore = useProfileStore(s => s.initFromStore);

  useEffect(() => {
    initFromStore();
    startProfileRefresh();
  }, [initFromStore]);

  const statsEmpty = profile && profile.statistics.count === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {!username && !isLoading ? (
        <ProfileSetup />
      ) : isLoading && !profile ? (
        <ProfileSkeleton />
      ) : profile && !statsEmpty ? (
        <ProfileDashboard profile={profile} />
      ) : statsEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Statystyki tego użytkownika są prywatne</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useProfileStore.getState().clearProfile()}
            >
              Zmień użytkownika
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
