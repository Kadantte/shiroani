import { useState, useEffect, useRef } from 'react';
import { Cat } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';

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
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-foreground">Rozmiar maskotki</span>
                <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
                  {size}px
                </span>
              </div>
              <Slider
                aria-label="Rozmiar maskotki"
                value={[size]}
                min={48}
                max={256}
                step={8}
                onValueChange={handleSizeChange}
              />
              <div className="flex justify-between mt-1 font-mono text-[9.5px] text-muted-foreground/70 tracking-[0.06em]">
                <span>48px</span>
                <span>256px</span>
              </div>
            </div>

            <SettingsRow divider>
              <SettingsRowLabel
                title="Tryb widoczności"
                description="Kiedy maskotka ma być widoczna na pulpicie"
              />
              <Select value={visibilityMode} onValueChange={handleVisibilityModeChange}>
                <SelectTrigger className="w-56 h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Zawsze widoczna</SelectItem>
                  <SelectItem value="tray-only">Tylko przy zminimalizowanej</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>

            <SettingsRow divider>
              <SettingsRowLabel
                id="mascot-lock-label"
                title="Zablokuj pozycję"
                description="Zapobiega przypadkowemu przesuwaniu maskotki"
              />
              <Switch
                aria-labelledby="mascot-lock-label"
                checked={positionLocked}
                onCheckedChange={handleLockToggle}
              />
            </SettingsRow>

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
