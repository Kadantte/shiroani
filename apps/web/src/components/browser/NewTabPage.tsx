import { useState, useCallback, useMemo } from 'react';
import { Plus, X, Eye } from 'lucide-react';
import { APP_NAME } from '@shiroani/shared';
import type { QuickAccessSite } from '@shiroani/shared';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const handleRemoveSite = useCallback(
    (site: QuickAccessSite) => {
      if (site.isPredefined) {
        hidePredefined(site.id);
      } else {
        removeSite(site.id);
      }
    },
    [hidePredefined, removeSite]
  );

  const hiddenPredefined = PREDEFINED_SITES.filter(s => hiddenPredefinedIds.includes(s.id));

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto py-12 px-4 relative z-10">
      <div className="w-full max-w-3xl">
        {/* Branding */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground/80 tracking-tight">{APP_NAME}</h1>
        </div>

        {/* Quick Access Section */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Szybki dostęp
          </h2>
          <div className="grid grid-cols-5 gap-3">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/30 hover:bg-muted/50 text-xs text-muted-foreground transition-colors cursor-pointer"
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
            <div className="grid grid-cols-4 gap-2">
              {frequentSites.map(site => (
                <button
                  key={site.url}
                  onClick={() => onNavigate(site.url)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/40 transition-colors text-left cursor-pointer"
                >
                  {site.favicon ? (
                    <img
                      src={site.favicon}
                      alt=""
                      className="w-5 h-5 rounded-sm shrink-0"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-sm bg-muted shrink-0" />
                  )}
                  <span className="text-xs text-foreground/80 truncate">{site.title}</span>
                </button>
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
              className="h-8 text-sm"
            />
            <Input
              placeholder="https://example.com"
              value={newSiteUrl}
              onChange={e => setNewSiteUrl(e.target.value)}
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
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-border/30 hover:border-border/60 hover:bg-accent/30 transition-all cursor-pointer min-h-[100px]"
      >
        {site.icon ? (
          <img
            src={site.icon}
            alt=""
            className="w-10 h-10 rounded-md"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
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
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
