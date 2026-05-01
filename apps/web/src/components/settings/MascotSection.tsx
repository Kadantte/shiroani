import { useState, useEffect, useRef } from 'react';
import { Cat, Image as ImageIcon, RotateCcw } from 'lucide-react';
import type { MascotSpriteScaleMode } from '@shiroani/shared';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsSelectRow,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { MascotPreview } from '@/components/settings/MascotPreview';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';

const VISIBILITY_OPTIONS = [
  { value: 'always', label: 'Zawsze widoczna' },
  { value: 'tray-only', label: 'Tylko gdy okno jest zminimalizowane' },
];

/**
 * Scale-mode options for the custom sprite. Mirrors the `MascotSpriteScaleMode`
 * union — keep these in sync if the union ever grows. Labels are PL-first to
 * match the rest of the Settings panel.
 */
const SCALE_MODE_OPTIONS: ReadonlyArray<{ value: MascotSpriteScaleMode; label: string }> = [
  { value: 'contain', label: 'Dopasuj (zachowaj proporcje)' },
  { value: 'cover', label: 'Wypełnij (przytnij brzegi)' },
  { value: 'stretch', label: 'Rozciągnij' },
];

const MASCOT_MIN_SIZE = 48;
const MASCOT_MAX_SIZE = 256;

export function MascotSection() {
  const [enabled, setEnabled] = useState(true);
  const [size, setSize] = useState(128);
  const [visibilityMode, setVisibilityMode] = useState('always');
  const [positionLocked, setPositionLocked] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const customSpriteUrl = useMascotSpriteStore(s => s.customSpriteUrl);
  const scaleMode = useMascotSpriteStore(s => s.scaleMode);
  const pickSprite = useMascotSpriteStore(s => s.pickSprite);
  const removeSprite = useMascotSpriteStore(s => s.removeSprite);
  const setScaleMode = useMascotSpriteStore(s => s.setScaleMode);

  useEffect(() => {
    const api = window.electronAPI?.overlay;
    if (!api) return;

    Promise.all([
      api.isEnabled(),
      api.getSize(),
      api.getVisibilityMode(),
      api.isPositionLocked(),
      api.isAnimationEnabled(),
    ]).then(([en, sz, mode, locked, anim]) => {
      setEnabled(en);
      setSize(sz);
      setVisibilityMode(mode);
      setPositionLocked(locked);
      setAnimationEnabled(anim);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleToggle = async (value: boolean) => {
    setEnabled(value);
    await window.electronAPI?.overlay?.setEnabled(value);
  };

  const handleSizeChange = (values: number[]) => {
    const newSize = values[0];
    setSize(newSize);

    // Debounce the actual resize to avoid spamming the native addon
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      window.electronAPI?.overlay?.setSize(newSize);
    }, 150);
  };

  const handleVisibilityModeChange = async (mode: string) => {
    setVisibilityMode(mode);
    await window.electronAPI?.overlay?.setVisibilityMode(mode);
  };

  const handleLockToggle = async (value: boolean) => {
    setPositionLocked(value);
    await window.electronAPI?.overlay?.setPositionLocked(value);
  };

  const handleAnimationToggle = async (value: boolean) => {
    setAnimationEnabled(value);
    await window.electronAPI?.overlay?.setAnimationEnabled(value);
  };

  const handleResetPosition = async () => {
    await window.electronAPI?.overlay?.resetPosition();
  };

  const handlePickSprite = async () => {
    setPickError(null);
    setPicking(true);
    try {
      await pickSprite();
    } catch (err) {
      // pickSprite re-throws on validation/IO errors so the user sees a
      // concrete reason (file too big, wrong format, etc.) instead of a
      // silent no-op. The string comes from the main process and is
      // already user-facing PL copy.
      const message = err instanceof Error ? err.message : 'Nie udało się wczytać sprite';
      setPickError(message);
    } finally {
      setPicking(false);
    }
  };

  const handleRemoveSprite = async () => {
    setPickError(null);
    await removeSprite();
  };

  const handleScaleModeChange = (mode: string) => {
    if (mode === 'contain' || mode === 'cover' || mode === 'stretch') {
      void setScaleMode(mode);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Cat}
        title="Maskotka na pulpicie"
        subtitle="Animowana maskotka chibi na pulpicie z ikonką w zasobniku systemowym."
        headerAccessory={
          <Switch aria-label="Włącz maskotkę" checked={enabled} onCheckedChange={handleToggle} />
        }
      >
        {enabled && (
          <>
            <MascotPreview current={size} min={MASCOT_MIN_SIZE} max={MASCOT_MAX_SIZE} />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Rozmiar maskotki</span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-primary">
                  {size}px
                </span>
              </div>
              <Slider
                aria-label="Rozmiar maskotki"
                value={[size]}
                min={MASCOT_MIN_SIZE}
                max={MASCOT_MAX_SIZE}
                step={8}
                onValueChange={handleSizeChange}
              />
              <div className="mt-1 flex justify-between font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground/70">
                <span>{MASCOT_MIN_SIZE}px</span>
                <span>{MASCOT_MAX_SIZE}px</span>
              </div>
            </div>

            <SettingsRow divider>
              <SettingsRowLabel
                title="Własny sprite"
                description="PNG, JPG, GIF lub WEBP · maks. 10 MB · 2048×2048 px. Animowane GIF-y wyświetlą się jako pierwsza klatka."
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border-glass"
                  onClick={handlePickSprite}
                  disabled={picking}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {customSpriteUrl ? 'Zmień' : 'Wybierz sprite'}
                </Button>
                {customSpriteUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs border border-border-glass"
                    onClick={handleRemoveSprite}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resetuj
                  </Button>
                )}
              </div>
            </SettingsRow>

            {pickError && (
              <p
                role="alert"
                className="text-[11.5px] text-destructive/90 font-medium tracking-[0.01em]"
              >
                {pickError}
              </p>
            )}

            {customSpriteUrl && (
              <SettingsSelectRow
                divider
                title="Skalowanie sprite"
                description="Jak dopasować obraz do kwadratowego okna maskotki"
                value={scaleMode}
                onValueChange={handleScaleModeChange}
                options={SCALE_MODE_OPTIONS}
                triggerClassName="w-64"
              />
            )}

            <SettingsSelectRow
              divider
              title="Tryb widoczności"
              description="Kiedy maskotka ma być widoczna na pulpicie"
              value={visibilityMode}
              onValueChange={handleVisibilityModeChange}
              options={VISIBILITY_OPTIONS}
              triggerClassName="w-56"
            />

            <SettingsToggleRow
              divider
              id="mascot-lock-label"
              title="Zablokuj pozycję"
              description="Zapobiega przypadkowemu przesuwaniu maskotki"
              checked={positionLocked}
              onCheckedChange={handleLockToggle}
            />

            <SettingsToggleRow
              divider
              id="mascot-animation-label"
              title="Animacja maskotki"
              description="Lekkie kołysanie góra-dół. Wyłącz, aby maskotka stała nieruchomo."
              checked={animationEnabled}
              onCheckedChange={handleAnimationToggle}
            />

            <SettingsRow divider>
              <SettingsRowLabel
                title="Resetuj pozycję"
                description="Przywróć maskotkę do domyślnej pozycji (prawy dolny róg)"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border-glass"
                onClick={handleResetPosition}
              >
                Resetuj
              </Button>
            </SettingsRow>
          </>
        )}
      </SettingsCard>
    </div>
  );
}
