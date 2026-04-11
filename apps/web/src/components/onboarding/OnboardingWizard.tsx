import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Palette,
  Image,
  GripHorizontal,
  MessageCircle,
  Shield,
  Sparkles,
  Check,
  PartyPopper,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { APP_LOGO_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ThemeSwatch } from '@/components/settings/ThemeSwatch';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useDockStore } from '@/stores/useDockStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { darkThemes, lightThemes } from '@/lib/theme';

const TOTAL_STEPS = 6;

// Playful mascot captions per step
const MASCOT_CAPTIONS = [
  'Cześć! Jestem Shiro-chan~',
  'Pokaż mi swój styl!',
  'Może jakieś ładne tło?',
  'Gdzie chcesz mój dock?',
  'Pokażemy się na Discordzie!',
  'Jesteśmy gotowi!',
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isExiting, setIsExiting] = useState(false);
  const setCompleted = useOnboardingStore(s => s.setCompleted);
  const next = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection('forward');
      setStep(s => s + 1);
    }
  }, [step]);

  const prev = useCallback(() => {
    if (step > 0) {
      setDirection('backward');
      setStep(s => s - 1);
    }
  }, [step]);

  const finish = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setCompleted();
      onComplete();
    }, 500);
  }, [setCompleted, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step === TOTAL_STEPS - 1) finish();
        else next();
      }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') {
        setDirection('forward');
        setStep(TOTAL_STEPS - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, next, prev, finish]);

  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-background overflow-hidden',
        'transition-[opacity,transform] duration-500 ease-out',
        isExiting && 'opacity-0 scale-[1.03]',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Kreator pierwszego uruchomienia"
    >
      {/* Draggable region for Electron */}
      {IS_ELECTRON && <div className="absolute inset-x-0 top-0 h-8 drag" />}

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-blob-drift-1" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-primary/8 blur-3xl animate-blob-drift-2" />
      </div>

      {/* Content area */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6">
        {/* Mascot + caption */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <img
            src={APP_LOGO_URL}
            alt="Maskotka ShiroAni"
            className="w-20 h-20 object-contain drop-shadow-lg animate-onb-mascot"
            draggable={false}
          />
          <p
            key={step}
            className="text-sm text-muted-foreground animate-[splash-fade-up_0.4s_ease-out_both]"
          >
            {MASCOT_CAPTIONS[step]}
          </p>
        </div>

        {/* Step content with transition */}
        <div
          key={step}
          className={cn(
            'w-full',
            direction === 'forward'
              ? 'animate-[onb-slide-in-right_0.35s_ease-out_both]'
              : 'animate-[onb-slide-in-left_0.35s_ease-out_both]'
          )}
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && <ThemeStep />}
          {step === 2 && <BackgroundStep />}
          {step === 3 && <DockStep />}
          {step === 4 && <DiscordStep />}
          {step === 5 && <FinishStep />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between w-full mt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={isFirst}
            className={cn('gap-1.5 text-muted-foreground', isFirst && 'invisible')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Wstecz
          </Button>

          {/* Progress dots */}
          <div className="flex items-center gap-1" role="group" aria-label="Postęp konfiguracji">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                key={i}
                aria-label={`Krok ${i + 1}`}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => {
                  setDirection(i > step ? 'forward' : 'backward');
                  setStep(i);
                }}
                className="p-2"
              >
                <span
                  className={cn(
                    'block rounded-full transition-all duration-300',
                    i === step
                      ? 'w-6 h-2 bg-primary'
                      : i < step
                        ? 'w-2 h-2 bg-primary/50'
                        : 'w-2 h-2 bg-muted-foreground/30'
                  )}
                />
              </button>
            ))}
          </div>

          {isLast ? (
            <Button size="sm" onClick={finish} className="gap-1.5">
              <PartyPopper className="w-3.5 h-3.5" />
              Zaczynamy!
            </Button>
          ) : (
            <Button size="sm" onClick={next} className="gap-1.5">
              Dalej
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Skip link */}
        {!isLast && (
          <button
            onClick={finish}
            className="mt-4 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Pomiń konfigurację
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 0: Welcome ─────────────────────────────────────────────

function WelcomeStep() {
  return (
    <div className="text-center space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Witaj w <span className="text-gradient">ShiroAni</span>!
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Skonfigurujmy razem Twoje idealne anime-gniazdko. Zajmie to tylko chwilkę~
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        {[
          { icon: Palette, label: 'Motyw' },
          { icon: Image, label: 'Tło' },
          { icon: GripHorizontal, label: 'Dock' },
          { icon: MessageCircle, label: 'Discord' },
          { icon: Shield, label: 'Adblock' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-2xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: Theme Picker ────────────────────────────────────────

function ThemeStep() {
  const { theme, setTheme, setPreviewTheme } = useSettingsStore();
  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <Palette className="w-4.5 h-4.5 text-primary" />
          Wybierz motyw
        </h2>
        <p className="text-sm text-muted-foreground">
          Możesz zmienić to później w ustawieniach. Najedź by podejrzeć!
        </p>
      </div>

      {/* Dark themes */}
      <div>
        <p className="text-2xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Ciemne
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
          {darkThemes.map(opt => (
            <ThemeSwatch
              key={opt.value}
              option={opt}
              isActive={theme === opt.value}
              onSelect={setTheme}
              onPreview={setPreviewTheme}
              onPreviewEnd={clearPreview}
            />
          ))}
        </div>
      </div>

      {/* Light themes */}
      <div>
        <p className="text-2xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Jasne
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
          {lightThemes.map(opt => (
            <ThemeSwatch
              key={opt.value}
              option={opt}
              isActive={theme === opt.value}
              onSelect={setTheme}
              onPreview={setPreviewTheme}
              onPreviewEnd={clearPreview}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Background ──────────────────────────────────────────

function BackgroundStep() {
  const customBackground = useBackgroundStore(s => s.customBackground);
  const pickBackground = useBackgroundStore(s => s.pickBackground);
  const removeBackground = useBackgroundStore(s => s.removeBackground);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <Image className="w-4.5 h-4.5 text-primary" />
          Tło aplikacji
        </h2>
        <p className="text-sm text-muted-foreground">
          Ustaw swój ulubiony obrazek lub GIF jako tło
        </p>
      </div>

      <div className="bg-background/40 border border-border-glass backdrop-blur-sm rounded-xl p-4 space-y-3">
        {customBackground ? (
          <div className="rounded-lg overflow-hidden border border-border-glass h-28">
            <img src={customBackground} alt="Podgląd tła" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border-glass h-28 flex flex-col items-center justify-center gap-2">
            <Image className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Brak tła</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass"
            onClick={pickBackground}
          >
            <Image className="w-4 h-4" />
            Wybierz obraz
          </Button>
          {customBackground && (
            <Button variant="ghost" size="sm" onClick={removeBackground}>
              <RotateCcw className="w-4 h-4" />
              Usuń
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Przezroczystość i rozmycie dostosujesz potem w ustawieniach
        </p>
      </div>
    </div>
  );
}

// ── Step 3: Dock ────────────────────────────────────────────────

function DockStep() {
  const autoHide = useDockStore(s => s.autoHide);
  const setAutoHide = useDockStore(s => s.setAutoHide);
  const showLabels = useDockStore(s => s.showLabels);
  const setShowLabels = useDockStore(s => s.setShowLabels);
  const draggable = useDockStore(s => s.draggable);
  const setDraggable = useDockStore(s => s.setDraggable);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <GripHorizontal className="w-4.5 h-4.5 text-primary" />
          Dock nawigacyjny
        </h2>
        <p className="text-sm text-muted-foreground">
          Pasek z ikonami nawigacji — ustaw jak lubisz
        </p>
      </div>

      <div className="bg-background/40 border border-border-glass backdrop-blur-sm rounded-xl p-4 space-y-3.5">
        <ToggleRow
          id="onb-dock-autohide"
          label="Automatyczne ukrywanie"
          description="Dock zwija się do ikony i rozwija po najechaniu"
          checked={autoHide}
          onChange={setAutoHide}
        />

        <ToggleRow
          id="onb-dock-labels"
          label="Pokaż etykiety"
          description="Wyświetlaj nazwy pod ikonami nawigacji"
          checked={showLabels}
          onChange={setShowLabels}
        />

        <ToggleRow
          id="onb-dock-drag"
          label="Przeciąganie"
          description="Pozwól na zmianę pozycji docka przeciąganiem"
          checked={draggable}
          onChange={setDraggable}
        />
      </div>
    </div>
  );
}

// ── Step 4: Discord RPC ─────────────────────────────────────────

function DiscordStep() {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load current setting
  useEffect(() => {
    window.electronAPI?.discordRpc
      ?.getSettings()
      .then((s: { enabled?: boolean } | null) => {
        if (s && typeof s.enabled === 'boolean') setEnabled(s.enabled);
      })
      .catch(() => {});
  }, []);

  // Save when toggled
  const handleToggle = useCallback(async (value: boolean) => {
    setEnabled(value);
    setSaving(true);
    try {
      const current = await window.electronAPI?.discordRpc?.getSettings();
      if (current) {
        await window.electronAPI?.discordRpc?.updateSettings({ ...current, enabled: value });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Electron API unavailable or failed — degrade silently
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <MessageCircle className="w-4.5 h-4.5 text-primary" />
          Discord Rich Presence
        </h2>
        <p className="text-sm text-muted-foreground">
          Pokaż znajomym co oglądasz i wspieraj rozwój ShiroAni!
        </p>
      </div>

      <div className="bg-background/40 border border-border-glass backdrop-blur-sm rounded-xl p-4 space-y-4">
        {!IS_ELECTRON && (
          <p className="text-xs text-amber-500">Dostępne tylko w wersji desktopowej</p>
        )}

        <ToggleRow
          id="onb-discord"
          label="Włącz integrację"
          description="Wyświetlaj aktywność w ShiroAni na profilu Discord"
          checked={enabled}
          onChange={handleToggle}
          disabled={saving || !IS_ELECTRON}
        />

        {/* Mock Discord card preview */}
        <p className="text-2xs text-muted-foreground">Podgląd Discorda</p>
        <div className="rounded-lg bg-[#2b2d31] p-3 space-y-2 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center overflow-hidden">
              <img src={APP_LOGO_URL} alt="" className="w-8 h-8 object-contain" draggable={false} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">ShiroAni</p>
              <p className="text-[11px] text-gray-300 truncate">
                {enabled ? 'Ogląda: Spy × Family S2' : 'Wyłączone'}
              </p>
              {enabled && (
                <p className="text-[10px] text-gray-400 truncate">02:15 &middot; odcinek 3</p>
              )}
            </div>
          </div>
        </div>

        {saved && (
          <p className="text-2xs text-status-success flex items-center gap-1 animate-fade-in">
            <Check className="w-3 h-3" />
            Zapisano
          </p>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Pokazywanie statusu na Discordzie pomaga innym odkryć ShiroAni. Szablony statusu
          dostosujesz potem w ustawieniach.
        </p>
      </div>
    </div>
  );
}

// ── Step 5: Finish + Adblock ────────────────────────────────────

function FinishStep() {
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);
  const setAdblockEnabled = useBrowserStore(s => s.setAdblockEnabled);

  const handleAdblock = useCallback(
    (value: boolean) => {
      setAdblockEnabled(value);
      // Persist to electron-store + toggle on session
      window.electronAPI?.store?.set('browser-settings', { adblockEnabled: value });
      window.electronAPI?.browser?.toggleAdblock(value);
    },
    [setAdblockEnabled]
  );

  const sparkles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const radius = 18 + Math.random() * 16; // tight around icon (18-34px)
        return {
          id: i,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 2 + Math.random() * 2,
          delay: Math.random() * 2,
          duration: 1.5 + Math.random() * 1.5,
        };
      }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="relative inline-block">
          <PartyPopper className="w-10 h-10 text-primary mx-auto animate-[splash-bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]" />
          {/* Celebration sparkles */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {sparkles.map(s => (
              <div
                key={s.id}
                className="absolute rounded-full bg-primary"
                style={{
                  left: `calc(50% + ${s.x}px)`,
                  top: `calc(50% + ${s.y}px)`,
                  width: s.size,
                  height: s.size,
                  animation: `splash-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite both`,
                }}
              />
            ))}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground">Wszystko gotowe!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          ShiroAni jest skonfigurowane. Ostatnia rzecz — chcesz blokować reklamy w wbudowanej
          przeglądarce?
        </p>
      </div>

      <div className="bg-background/40 border border-border-glass backdrop-blur-sm rounded-xl p-4 space-y-3">
        {!IS_ELECTRON && (
          <p className="text-xs text-amber-500">Dostępne tylko w wersji desktopowej</p>
        )}
        <ToggleRow
          id="onb-adblock"
          label="Blokowanie reklam"
          description="Blokuj reklamy w wbudowanej przeglądarce (EasyList + EasyPrivacy)"
          checked={adblockEnabled}
          onChange={handleAdblock}
          disabled={!IS_ELECTRON}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Wszystkie ustawienia możesz zmienić w dowolnym momencie
      </p>
    </div>
  );
}

// ── Shared toggle row ───────────────────────────────────────────

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground" id={`${id}-label`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground" id={`${id}-desc`}>
          {description}
        </p>
      </div>
      <Switch
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
