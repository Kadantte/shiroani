import { useEffect } from 'react';
import { Download, ExternalLink, Loader2, Package, RefreshCw } from 'lucide-react';
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

  const statusTone: 'green' | 'accent' | 'destructive' | 'muted' = (() => {
    if (status === 'error') return 'destructive';
    if (status === 'idle') return 'green';
    if (status === 'available' || status === 'downloading' || status === 'ready') return 'accent';
    return 'muted';
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
      {/* Version + channel — editorial hero */}
      <SettingsCard
        icon={RefreshCw}
        title="Wersja aplikacji"
        subtitle={isMac ? 'Aktualna wersja ShiroAni.' : 'Aktualna wersja i kanał aktualizacji.'}
      >
        <div className="flex flex-wrap items-end gap-6 pb-3.5 border-b border-border-glass/60">
          <div>
            <p className="font-serif font-extrabold text-[44px] leading-none tracking-[-0.04em] text-foreground tabular-nums">
              {version || '...'}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
              {channel === 'beta' ? 'KANAŁ BETA' : 'KANAŁ STABILNY'}
            </p>
          </div>
          <StatusPill tone={statusTone} text={statusText} />
        </div>

        {!isMac && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
              Kanał aktualizacji
            </p>
            <div className="inline-flex items-center gap-1">
              <ChannelButton
                active={channel === 'stable'}
                disabled={isChannelSwitching}
                onClick={() => setChannel('stable')}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    channel === 'stable' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                Stabilna
              </ChannelButton>
              <ChannelButton
                active={channel === 'beta'}
                disabled={isChannelSwitching}
                onClick={() => setChannel('beta')}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    channel === 'beta' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                Beta
              </ChannelButton>
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground/80 leading-relaxed">
              Kanał stabilny otrzymuje aktualizacje po pełnym przetestowaniu. Beta może zawierać
              błędy.
            </p>
          </div>
        )}

        {/* Actions */}
        {isMac ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
              Automatyczne aktualizacje nie są na razie dostępne na macOS ze względu na brak podpisu
              cyfrowego. Pobierz najnowszą wersję ręcznie z GitHub Releases lub Discorda.
            </p>
            <Button size="sm" variant="outline" onClick={openReleasesPage}>
              <ExternalLink className="w-4 h-4" />
              Otwórz GitHub Releases
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={checkForUpdates}
                disabled={status === 'checking' || status === 'downloading'}
              >
                {status === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sprawdź aktualizacje
              </Button>

              {status === 'available' && (
                <Button size="sm" variant="outline" onClick={startDownload}>
                  <Download className="w-4 h-4" />
                  Pobierz
                </Button>
              )}

              {status === 'ready' && (
                <Button size="sm" variant="outline" onClick={installNow}>
                  Zainstaluj teraz
                </Button>
              )}
            </div>

            {/* Download progress */}
            {status === 'downloading' && progress && (
              <div
                className="mt-2 w-full bg-primary/20 rounded-full h-1.5 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(progress.percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Postęp pobierania"
              >
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            )}

            <Package className="hidden" />
          </div>
        )}
      </SettingsCard>
    </div>
  );
}

// ── Helper components ───────────────────────────────────────────────

function StatusPill({
  tone,
  text,
}: {
  tone: 'green' | 'accent' | 'destructive' | 'muted';
  text: string;
}) {
  const toneClass = {
    green:
      'bg-[oklch(0.78_0.15_140/0.12)] border-[oklch(0.78_0.15_140/0.3)] text-[oklch(0.78_0.15_140)]',
    accent: 'bg-primary/12 border-primary/30 text-primary',
    destructive: 'bg-destructive/12 border-destructive/30 text-destructive',
    muted: 'bg-muted/15 border-border-glass text-muted-foreground',
  }[tone];

  const dotClass = {
    green: 'bg-[oklch(0.78_0.15_140)] shadow-[0_0_8px_oklch(0.78_0.15_140/0.6)]',
    accent: 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]',
    destructive: 'bg-destructive',
    muted: 'bg-muted-foreground/60',
  }[tone];

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold',
        toneClass
      )}
    >
      <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotClass)} />
      <span className="leading-tight">{text}</span>
    </div>
  );
}

function ChannelButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-[6px] rounded-lg border text-[12px] font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        active
          ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
          : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
