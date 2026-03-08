import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Globe,
  Download,
  Info,
  Check,
  Image,
  RotateCcw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { darkThemes, lightThemes, type ThemeOption } from '@/lib/theme';
import type { Theme } from '@shiroani/shared';
import { APP_NAME, GITHUB_RELEASES_URL } from '@shiroani/shared';
import { useBrowserStore } from '@/stores/useBrowserStore';

type SettingsSection = 'appearance' | 'browser' | 'updates' | 'about';

const SECTIONS: { id: SettingsSection; label: string; Icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Wyglad', Icon: Palette },
  { id: 'browser', label: 'Przegladarka', Icon: Globe },
  { id: 'updates', label: 'Aktualizacje', Icon: Download },
  { id: 'about', label: 'O aplikacji', Icon: Info },
];

function ThemeSwatch({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  option: ThemeOption;
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
}) {
  return (
    <button
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => onPreview(option.value)}
      onMouseLeave={onPreviewEnd}
      className={cn(
        'relative flex flex-col items-center gap-1.5 p-2 rounded-lg',
        'transition-all duration-150',
        'hover:bg-accent/50',
        isActive && 'ring-2 ring-primary bg-accent/30'
      )}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
        style={{ backgroundColor: option.color }}
      >
        {isActive && (
          <div className="w-full h-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white drop-shadow" />
          </div>
        )}
      </div>
      <span className="text-2xs text-muted-foreground truncate max-w-[60px]">{option.label}</span>
    </button>
  );
}

function AppearanceSection() {
  const { theme, setTheme, setPreviewTheme, customBackground, setCustomBackground } =
    useSettingsStore();

  const handleSelectBackground = useCallback(async () => {
    const path = await window.electronAPI?.dialog?.openFile({
      filters: [{ name: 'Obrazy', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (path) {
      setCustomBackground(path);
    }
  }, [setCustomBackground]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">Motyw</h3>
        <p className="text-xs text-muted-foreground mb-3">Wybierz motyw kolorystyczny aplikacji</p>

        {/* Dark themes */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Ciemne</h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1">
            {darkThemes.map(opt => (
              <ThemeSwatch
                key={opt.value}
                option={opt}
                isActive={theme === opt.value}
                onSelect={setTheme}
                onPreview={setPreviewTheme}
                onPreviewEnd={() => setPreviewTheme(null)}
              />
            ))}
          </div>
        </div>

        {/* Light themes */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Jasne</h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1">
            {lightThemes.map(opt => (
              <ThemeSwatch
                key={opt.value}
                option={opt}
                isActive={theme === opt.value}
                onSelect={setTheme}
                onPreview={setPreviewTheme}
                onPreviewEnd={() => setPreviewTheme(null)}
              />
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Custom background */}
      <div>
        <h3 className="text-sm font-medium mb-1">Tlo</h3>
        <p className="text-xs text-muted-foreground mb-3">Ustaw wlasne tlo (obraz lub GIF)</p>

        {customBackground && (
          <div className="mb-3 rounded-lg overflow-hidden border border-border h-24">
            <img
              src={`file://${customBackground}`}
              alt="Tlo"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectBackground}>
            <Image className="w-4 h-4" />
            Wybierz tlo
          </Button>
          {customBackground && (
            <Button variant="ghost" size="sm" onClick={() => setCustomBackground(null)}>
              <RotateCcw className="w-4 h-4" />
              Przywroc domyslne
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BrowserSection() {
  const { adblockEnabled, setAdblockEnabled } = useSettingsStore();
  const [homepage, setHomepage] = useState('https://anilist.co');
  const [userAgent, setUserAgent] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* Adblock */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Blokowanie reklam</h3>
          <p className="text-xs text-muted-foreground">Blokuj reklamy w wbudowanej przegladarce</p>
        </div>
        <Switch checked={adblockEnabled} onCheckedChange={setAdblockEnabled} />
      </div>

      <Separator />

      {/* Default homepage */}
      <div>
        <h3 className="text-sm font-medium mb-1">Strona domowa</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Domyslna strona otwierana w nowych kartach
        </p>
        <Input
          value={homepage}
          onChange={e => setHomepage(e.target.value)}
          placeholder="https://anilist.co"
          className="h-8 text-xs"
        />
      </div>

      <Separator />

      {/* Advanced */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? 'Ukryj zaawansowane' : 'Pokaz zaawansowane'}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">User Agent</label>
            <Input
              value={userAgent}
              onChange={e => setUserAgent(e.target.value)}
              placeholder="Domyslny"
              className="h-8 text-xs font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function UpdatesSection() {
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

  const [version, setVersion] = useState('');

  useEffect(() => {
    const cleanup = initListeners();
    window.electronAPI?.app?.getVersion().then(v => setVersion(v));
    return cleanup;
  }, [initListeners]);

  const statusText = (() => {
    switch (status) {
      case 'idle':
        return 'Brak nowych aktualizacji';
      case 'checking':
        return 'Sprawdzanie...';
      case 'available':
        return `Dostepna aktualizacja: ${updateInfo?.version ?? ''}`;
      case 'downloading':
        return `Pobieranie... ${progress ? `${Math.round(progress.percent)}%` : ''}`;
      case 'ready':
        return 'Aktualizacja gotowa do instalacji';
      case 'error':
        return `Blad: ${error ?? 'Nieznany blad'}`;
      default:
        return '';
    }
  })();

  return (
    <div className="space-y-6">
      {/* Version */}
      <div>
        <h3 className="text-sm font-medium mb-1">Wersja</h3>
        <p className="text-base font-mono text-foreground">{version || '...'}</p>
      </div>

      <Separator />

      {/* Channel */}
      <div>
        <h3 className="text-sm font-medium mb-2">Kanal aktualizacji</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setChannel('stable')}
            disabled={isChannelSwitching}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              channel === 'stable'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20'
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
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/20'
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

      <Separator />

      {/* Check for updates */}
      <div>
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
            Sprawdz aktualizacje
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
      </div>
    </div>
  );
}

function AboutSection() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.electronAPI?.app?.getVersion().then(v => setVersion(v));
  }, []);

  return (
    <div className="space-y-6">
      {/* App info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">SA</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{APP_NAME}</h2>
          <p className="text-xs text-muted-foreground">Wersja {version || '...'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Przegladarka i tracker anime na Twoj desktop
          </p>
        </div>
      </div>

      <Separator />

      {/* Links */}
      <div className="space-y-2">
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            if (window.electronAPI?.browser) {
              useBrowserStore.getState().openTab(GITHUB_RELEASES_URL);
            } else {
              window.open(GITHUB_RELEASES_URL, '_blank');
            }
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          GitHub
        </a>
      </div>

      <Separator />

      {/* License */}
      <div>
        <h3 className="text-sm font-medium mb-1">Licencja</h3>
        <p className="text-xs text-muted-foreground">MIT License</p>
      </div>
    </div>
  );
}

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Section navigation */}
      <div className="w-44 shrink-0 border-r border-border bg-card/30 p-3 space-y-0.5">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
              'transition-all duration-150',
              activeSection === section.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <section.Icon className="w-4 h-4 shrink-0" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl">
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'browser' && <BrowserSection />}
          {activeSection === 'updates' && <UpdatesSection />}
          {activeSection === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  );
}
