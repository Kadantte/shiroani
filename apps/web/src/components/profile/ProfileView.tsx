import { useEffect, useState } from 'react';
import { User, RefreshCw, ExternalLink, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useProfileStore, startProfileRefresh } from '@/stores/useProfileStore';
import { ProfileSetup } from './ProfileSetup';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProfileDashboard } from './ProfileDashboard';
import { ProfileShareDialog } from './ProfileShareDialog';

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

  useEffect(() => {
    initFromStore();
    startProfileRefresh();
  }, [initFromStore]);

  const statsEmpty = profile && profile.statistics.count === 0;

  const subtitle = profile
    ? `AniList · @${profile.name.toLowerCase()}`
    : username
      ? `AniList · @${username.toLowerCase()}`
      : 'Połącz konto AniList, aby zobaczyć statystyki';

  const canShare = Boolean(profile && !statsEmpty);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      {/* ── Editorial view header (matches .vh) ─────────────────────── */}
      <div className="relative flex items-center justify-between border-b border-border-glass px-7 pt-[18px] pb-4 shrink-0 z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={cn(
              'size-9 rounded-[10px] grid place-items-center flex-shrink-0',
              'bg-primary/15 border border-primary/30 text-primary'
            )}
          >
            <User className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] leading-none text-foreground truncate">
              Mój profil
            </h1>
            <span className="block mt-[3px] font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium truncate">
              {subtitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {profile && (
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
          {canShare && (
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
          {profile?.siteUrl && (
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
        </div>
      </div>

      {/* ── Body: state switcher with watermark layer ──────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="我" position="br" size={280} opacity={0.03} />
        </div>

        <div className="relative z-[1] h-full flex flex-col">
          {!username && !isLoading ? (
            <ProfileSetup />
          ) : isLoading && !profile ? (
            <ProfileSkeleton />
          ) : profile && !statsEmpty ? (
            <ProfileDashboard profile={profile} onShare={() => setShareOpen(true)} />
          ) : statsEmpty ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Statystyki tego użytkownika są prywatne
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
