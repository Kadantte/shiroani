import { useState, useEffect, useRef } from 'react';
import { Cat } from 'lucide-react';
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

const VISIBILITY_OPTIONS = [
  { value: 'always', label: 'Zawsze widoczna' },
  { value: 'tray-only', label: 'Tylko przy zminimalizowanej' },
];

const MASCOT_MIN_SIZE = 48;
const MASCOT_MAX_SIZE = 256;

export function MascotSection() {
  const [enabled, setEnabled] = useState(true);
  const [size, setSize] = useState(128);
  const [visibilityMode, setVisibilityMode] = useState('always');
  const [positionLocked, setPositionLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const api = window.electronAPI?.overlay;
    if (!api) return;

    Promise.all([
      api.isEnabled(),
      api.getSize(),
      api.getVisibilityMode(),
      api.isPositionLocked(),
    ]).then(([en, sz, mode, locked]) => {
      setEnabled(en);
      setSize(sz);
      setVisibilityMode(mode);
      setPositionLocked(locked);
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

  const handleResetPosition = async () => {
    await window.electronAPI?.overlay?.resetPosition();
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Cat}
        title="Maskotka na pulpicie"
        subtitle="Wyświetl animowaną maskotkę chibi z ikonką w zasobniku systemowym."
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
