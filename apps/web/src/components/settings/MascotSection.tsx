import { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Maskotka na pulpicie</h3>
          <p className="text-xs text-muted-foreground">
            Wyswietl animowana maskotke chibi na pulpicie z ikonka w zasobniku systemowym
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Rozmiar maskotki</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{size}px</span>
            </div>
            <Slider value={[size]} min={48} max={256} step={8} onValueChange={handleSizeChange} />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">48px</span>
              <span className="text-[10px] text-muted-foreground">256px</span>
            </div>
          </div>

          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-1">Tryb widocznosci</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Kiedy maskotka ma byc widoczna na pulpicie
            </p>
            <Select value={visibilityMode} onValueChange={handleVisibilityModeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Zawsze widoczna</SelectItem>
                <SelectItem value="tray-only">Tylko przy zminimalizowanej aplikacji</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Zablokuj pozycje</h3>
              <p className="text-xs text-muted-foreground">
                Zapobiega przypadkowemu przesuwaniu maskotki
              </p>
            </div>
            <Switch checked={positionLocked} onCheckedChange={handleLockToggle} />
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Resetuj pozycje</h3>
              <p className="text-xs text-muted-foreground">
                Przywroc maskotke do domyslnej pozycji (prawy dolny rog)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetPosition}>
              Resetuj
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
