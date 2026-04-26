import { useEffect, useState } from 'react';
import { User, RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { useProfileStore, startProfileRefresh } from '@/stores/useProfileStore';
import { ProfileSetup } from './ProfileSetup';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProfileDashboard } from './ProfileDashboard';
import { ProfileShareDialog } from './ProfileShareDialog';
import { InAppStatsPanel } from './InAppStatsPanel';

type ProfileTab = 'anilist' | 'app';

/**
 * Top-level Profile view. Renders the editorial `.vh`-style header and
 * delegates the body to one of three states:
 *   - {@link ProfileSetup}      — no AniList username stored yet
 *   - {@link ProfileSkeleton}   — fetching the first profile payload
 *   - {@link ProfileDashboard}  — full stat surface
 *
 * Header actions (refresh / share as PNG / open on AniList) live here so
 * they remain accessible across all states. `startProfileRefresh` keeps
 * the cached payload fresh in the background.
 */
export function ProfileView() {
  const username = useProfileStore(s => s.username);
  const profile = useProfileStore(s => s.profile);
  const isLoading = useProfileStore(s => s.isLoading);
  const initFromStore = useProfileStore(s => s.initFromStore);
  const fetchProfile = useProfileStore(s => s.fetchProfile);
  const clearProfile = useProfileStore(s => s.clearProfile);

  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('anilist');

  useEffect(() => {
    initFromStore();
    startProfileRefresh();
  }, [initFromStore]);

  const statsEmpty = profile && profile.statistics.count === 0;

  const subtitle =
    tab === 'app'
      ? 'Lokalnie · czas spędzony w ShiroAni'
      : profile
        ? `AniList · @${profile.name.toLowerCase()}`
        : username
          ? `AniList · @${username.toLowerCase()}`
          : 'Podłącz konto AniList, żeby zobaczyć statystyki';

  const canShare = Boolean(profile && !statsEmpty);
  const isAniListTab = tab === 'anilist';

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader
        icon={User}
        title="Mój profil"
        subtitle={subtitle}
        actions={
          <>
            <TabSwitcher tab={tab} onChange={setTab} />
            {isAniListTab && profile && (
              <TooltipButton
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => fetchProfile()}
                disabled={isLoading}
                tooltip="Odśwież"
                tooltipSide="bottom"
                aria-label="Odśwież profil"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </TooltipButton>
            )}
            {isAniListTab && canShare && (
              <TooltipButton
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setShareOpen(true)}
                tooltip="Udostępnij jako PNG"
                tooltipSide="bottom"
                aria-label="Udostępnij profil jako PNG"
              >
                <Share2 className="w-3.5 h-3.5" />
              </TooltipButton>
            )}
            {isAniListTab && profile?.siteUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(profile.siteUrl, '_blank', 'noopener,noreferrer')}
                className={cn(
                  'h-8 px-3 text-[12px] font-medium gap-1.5',
                  'bg-foreground/5 border border-foreground/10 hover:bg-foreground/10'
                )}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Otwórz AniList
              </Button>
            )}
          </>
        }
      />

      {/* ── Body: state switcher with watermark layer ──────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="我" position="br" size={280} opacity={0.03} />
        </div>

        <div className="relative z-[1] h-full flex flex-col">
          {tab === 'app' ? (
            <InAppStatsPanel />
          ) : !username && !isLoading ? (
            <ProfileSetup />
          ) : isLoading && !profile ? (
            <ProfileSkeleton />
          ) : profile && !statsEmpty ? (
            <ProfileDashboard profile={profile} onShare={() => setShareOpen(true)} />
          ) : statsEmpty ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ten użytkownik ma prywatne statystyki
                </p>
                <Button variant="outline" size="sm" onClick={() => clearProfile()}>
                  Zmień użytkownika
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {profile && !statsEmpty && (
        <ProfileShareDialog open={shareOpen} onOpenChange={setShareOpen} profile={profile} />
      )}
    </div>
  );
}

function TabSwitcher({ tab, onChange }: { tab: ProfileTab; onChange: (next: ProfileTab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Źródło statystyk profilu"
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-lg',
        'bg-foreground/5 border border-foreground/10'
      )}
    >
      <TabButton active={tab === 'anilist'} onClick={() => onChange('anilist')}>
        Z AniList
      </TabButton>
      <TabButton active={tab === 'app'} onClick={() => onChange('app')}>
        W aplikacji
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded-md text-[11.5px] font-medium tracking-[-0.01em] transition-colors',
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
      )}
    >
      {children}
    </button>
  );
}
