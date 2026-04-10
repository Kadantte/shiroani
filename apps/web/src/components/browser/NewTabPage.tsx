import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, X, Eye, CalendarDays } from 'lucide-react';
import { APP_NAME, toLocalDate } from '@shiroani/shared';
import type { QuickAccessSite, FrequentSite, AiringAnime } from '@shiroani/shared';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAppStore } from '@/stores/useAppStore';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTime } from '@/components/schedule/schedule-utils';
import { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';
import { handleImageError } from '@/lib/image-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface NewTabPageProps {
  onNavigate: (url: string) => void;
}

export function NewTabPage({ onNavigate }: NewTabPageProps) {
  const { customSites, frequentSites, hiddenPredefinedIds } = useQuickAccessStore(
    useShallow(s => ({
      customSites: s.sites,
      frequentSites: s.frequentSites,
      hiddenPredefinedIds: s.hiddenPredefinedIds,
    }))
  );
  const { addSite, removeSite, hidePredefined, showPredefined } = useQuickAccessStore.getState();

  const sites: QuickAccessSite[] = useMemo(() => {
    const visiblePredefined = PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id));
    return [...visiblePredefined, ...customSites];
  }, [hiddenPredefinedIds, customSites]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  const handleAddSite = useCallback(() => {
    const trimmedName = newSiteName.trim();
    const trimmedUrl = newSiteUrl.trim();
    if (!trimmedName || !trimmedUrl) return;

    const url = trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`;

    let icon: string | undefined;
    try {
      const domain = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      // Invalid URL, skip icon
    }

    addSite({ name: trimmedName, url, icon });
    setNewSiteName('');
    setNewSiteUrl('');
    setIsAddDialogOpen(false);
  }, [newSiteName, newSiteUrl, addSite]);

  const handleRemoveSite = useCallback((site: QuickAccessSite) => {
    if (site.isPredefined) {
      hidePredefined(site.id);
    } else {
      removeSite(site.id);
    }
  }, []);

  const hiddenPredefined = PREDEFINED_SITES.filter(s => hiddenPredefinedIds.includes(s.id));

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto py-12 px-4 relative z-10">
      <div className="w-full max-w-3xl">
        {/* Branding */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground/80 tracking-tight">{APP_NAME}</h1>
        </div>

        {/* Airing Today Section */}
        <AiringTodaySection />

        {/* Quick Access Section */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Szybki dostęp
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {sites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                onClick={() => onNavigate(site.url)}
                onRemove={() => handleRemoveSite(site)}
              />
            ))}
            {/* Add site button */}
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="group flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-border/50 hover:border-border hover:bg-accent/30 transition-all cursor-pointer min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-full bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Dodaj</span>
            </button>
          </div>
        </div>

        {/* Restore hidden predefined sites */}
        {hiddenPredefined.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Ukryte strony
            </h2>
            <div className="flex flex-wrap gap-2">
              {hiddenPredefined.map(site => (
                <button
                  key={site.id}
                  onClick={() => showPredefined(site.id)}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-md bg-muted/30 hover:bg-muted/50 text-xs text-muted-foreground transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  {site.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Frequently Visited Section */}
        {frequentSites.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Często odwiedzane
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {frequentSites.map(site => (
                <FrequentSiteButton
                  key={site.url}
                  site={site}
                  onClick={() => onNavigate(site.url)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Site Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dodaj stronę</DialogTitle>
            <DialogDescription>
              Dodaj stronę do szybkiego dostępu na nowej karcie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Nazwa"
              value={newSiteName}
              onChange={e => setNewSiteName(e.target.value)}
              aria-label="Nazwa strony"
              className="h-8 text-sm"
            />
            <Input
              placeholder="https://example.com"
              value={newSiteUrl}
              onChange={e => setNewSiteUrl(e.target.value)}
              aria-label="Adres URL strony"
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddSite();
              }}
              className="h-8 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              size="sm"
              onClick={handleAddSite}
              disabled={!newSiteName.trim() || !newSiteUrl.trim()}
            >
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MAX_AIRING_ENTRIES = 10;

/** Airing Today section showing anime airing on the current day */
function AiringTodaySection() {
  const todayKey = useMemo(() => toLocalDate(new Date()), []);

  const todayEntries = useScheduleStore(s => s.schedule[todayKey]);
  const isLoading = useScheduleStore(s => s.isLoading);
  const navigateTo = useAppStore(s => s.navigateTo);

  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(() => {
    const ids = new Set<number>();
    for (const entry of libraryEntries) {
      if (entry.anilistId != null) ids.add(entry.anilistId);
    }
    return ids;
  }, [libraryEntries]);

  const subscribedIds = useNotificationStore(s => s.subscribedIds);

  useEffect(() => {
    if (!todayEntries) {
      useScheduleStore.getState().fetchDaily(todayKey);
    }
  }, [todayKey, todayEntries]);

  const { userAnime, otherAnime, hasMore } = useMemo(() => {
    if (!todayEntries) return { userAnime: [], otherAnime: [], hasMore: false };

    const sorted = [...todayEntries].sort((a, b) => a.airingAt - b.airingAt);

    const user: AiringAnime[] = [];
    const other: AiringAnime[] = [];

    for (const entry of sorted) {
      const mediaId = entry.media.id;
      if (libraryAnilistIds.has(mediaId) || subscribedIds.has(mediaId)) {
        user.push(entry);
      } else {
        other.push(entry);
      }
    }

    const totalAvailable = user.length + other.length;
    const remaining = MAX_AIRING_ENTRIES - user.length;
    const visibleOther = remaining > 0 ? other.slice(0, remaining) : [];

    return {
      userAnime: user,
      otherAnime: visibleOther,
      hasMore: totalAvailable > MAX_AIRING_ENTRIES,
    };
  }, [todayEntries, libraryAnilistIds, subscribedIds]);

  // Don't render the section while loading with no data yet
  if (!todayEntries && isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Emitowane dzisiaj
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-4">
          <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/60 animate-spin" />
          Ładowanie...
        </div>
      </div>
    );
  }

  // No data or empty
  if (!todayEntries || todayEntries.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Emitowane dzisiaj
        </h2>
        <p className="text-xs text-muted-foreground/50 py-2">Brak anime na dziś</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
        <CalendarDays className="w-4 h-4" />
        Emitowane dzisiaj
      </h2>

      <div className="space-y-1.5">
        {userAnime.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground/70 mb-2">Twoje anime</p>
            {userAnime.map(entry => (
              <AiringCard key={entry.id} entry={entry} isUserAnime />
            ))}
            {otherAnime.length > 0 && <div className="h-2" />}
          </>
        )}

        {otherAnime.map(entry => (
          <AiringCard key={entry.id} entry={entry} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => navigateTo('schedule')}
          className="mt-3 text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer"
        >
          Zobacz harmonogram &rarr;
        </button>
      )}
    </div>
  );
}

/** Compact card for a single airing anime entry */
function AiringCard({ entry, isUserAnime }: { entry: AiringAnime; isUserAnime?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const title = getAnimeTitle(entry.media);
  const coverUrl = getCoverUrl(entry.media);
  const time = formatTime(entry.airingAt);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
        isUserAnime
          ? 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'
          : 'border-border/30 hover:border-border/60 hover:bg-accent/30'
      }`}
    >
      {/* Cover */}
      {coverUrl && !imgError ? (
        <img
          src={coverUrl}
          alt=""
          className="w-10 h-14 rounded object-cover shrink-0"
          onError={e => {
            setImgError(true);
            handleImageError(e);
          }}
        />
      ) : (
        <div className="w-10 h-14 rounded bg-muted shrink-0" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isUserAnime && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          <span className="text-sm font-medium text-foreground/90 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">Odc. {entry.episode}</span>
          <span className="text-xs text-muted-foreground/50">&middot;</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
      </div>
    </div>
  );
}

/** Individual site card with hover remove button */
function SiteCard({
  site,
  onClick,
  onRemove,
}: {
  site: QuickAccessSite;
  onClick: () => void;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-border/30 hover:border-border/60 hover:bg-accent/30 transition-all cursor-pointer min-h-[100px]"
      >
        {site.icon && !imgError ? (
          <img
            src={site.icon}
            alt=""
            className="w-10 h-10 rounded-md"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {site.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs text-foreground/70 truncate max-w-full">{site.name}</span>
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Usuń stronę"
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/** Frequent site button with React-managed favicon fallback */
function FrequentSiteButton({ site, onClick }: { site: FrequentSite; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/40 transition-colors text-left cursor-pointer"
    >
      {site.favicon && !imgError ? (
        <img
          src={site.favicon}
          alt=""
          className="w-5 h-5 rounded-sm shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-5 h-5 rounded-sm bg-muted shrink-0" />
      )}
      <span className="text-xs text-foreground/80 truncate">{site.title}</span>
    </button>
  );
}
