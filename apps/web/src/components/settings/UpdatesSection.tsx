import { useEffect } from 'react';
import { Download, ExternalLink, Loader2, Package } from 'lucide-react';
import { GITHUB_RELEASES_URL } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

interface UpdatesSectionProps {
  version: string;
}

export function UpdatesSection({ version }: UpdatesSectionProps) {
  const {
    status,
    updateInfo,
    progress,
    error,
    channel,
    isChannelSwitching,
    checkForUpdates,
    startDownload,
    installNow,
    setChannel,
    initListeners,
  } = useUpdateStore();

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  const isMac = window.electronAPI?.platform === 'darwin';

  const statusText = (() => {
    switch (status) {
      case 'idle':
        return 'Brak nowych aktualizacji';
      case 'checking':
        return 'Sprawdzanie...';
      case 'available':
        return `Dostępna aktualizacja: ${updateInfo?.version ?? ''}`;
      case 'downloading':
        return `Pobieranie... ${progress ? `${Math.round(progress.percent)}%` : ''}`;
      case 'ready':
        return 'Aktualizacja gotowa do instalacji';
      case 'error':
        return `Błąd: ${error ?? 'Nieznany błąd'}`;
      default:
        return '';
    }
  })();

  const openReleasesPage = () => {
    if (window.electronAPI?.browser) {
      useBrowserStore.getState().openTab(GITHUB_RELEASES_URL);
    } else {
      window.open(GITHUB_RELEASES_URL, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Version & Channel */}
      <SettingsCard
        icon={Package}
        title="Wersja aplikacji"
        subtitle={isMac ? 'Aktualna wersja' : 'Aktualna wersja i kanał aktualizacji'}
      >
        <div>
          <h3 className="text-sm font-medium mb-1">Wersja</h3>
          <p className="text-base font-semibold tabular-nums tracking-tight text-foreground">
            {version || '...'}
          </p>
        </div>

        {!isMac && (
          <div>
            <h3 className="text-sm font-medium mb-2">Kanał aktualizacji</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChannel('stable')}
                disabled={isChannelSwitching}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                  channel === 'stable'
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border-glass text-muted-foreground hover:border-foreground/20 hover:bg-accent/50'
                )}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    channel === 'stable' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                <span className="text-sm">Stabilna</span>
              </button>
              <button
                onClick={() => setChannel('beta')}
                disabled={isChannelSwitching}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                  channel === 'beta'
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border-glass text-muted-foreground hover:border-foreground/20 hover:bg-accent/50'
                )}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    channel === 'beta' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                <span className="text-sm">Beta</span>
              </button>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Updates */}
      <SettingsCard>
        {isMac ? (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Automatyczne aktualizacje nie są na razie dostępne na macOS ze względu na brak podpisu
              cyfrowego. Pobierz najnowszą wersję ręcznie z GitHub Releases lub Discorda.
            </p>
            <Button size="sm" variant="outline" onClick={openReleasesPage}>
              <ExternalLink className="w-4 h-4" />
              Otwórz GitHub Releases
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2">
              <Button
                size="sm"
                onClick={checkForUpdates}
                disabled={status === 'checking' || status === 'downloading'}
              >
                {status === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Sprawdź aktualizacje
              </Button>

              {status === 'available' && (
                <Button size="sm" variant="outline" onClick={startDownload}>
                  Pobierz
                </Button>
              )}

              {status === 'ready' && (
                <Button size="sm" variant="outline" onClick={installNow}>
                  Zainstaluj teraz
                </Button>
              )}
            </div>

            <p
              className={cn(
                'text-xs',
                status === 'error' ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {statusText}
            </p>

            {/* Download progress */}
            {status === 'downloading' && progress && (
              <div className="mt-2 w-full bg-primary/20 rounded-full h-1.5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            )}
          </>
        )}
      </SettingsCard>
    </div>
  );
}
