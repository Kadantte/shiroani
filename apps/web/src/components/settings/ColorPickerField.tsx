import { useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { oklchToHex, hexToOklch, isValidHexColor } from '@/lib/color-utils';

interface ColorPickerFieldProps {
  label: string;
  variableName: string;
  value: string; // oklch value
  onChange: (value: string) => void;
}

export function ColorPickerField({ label, variableName, value, onChange }: ColorPickerFieldProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const hexValue = value ? oklchToHex(value) : '#000000';

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      if (isValidHexColor(hex)) {
        onChange(hexToOklch(hex));
      }
    },
    [onChange]
  );

  const handleColorPickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(hexToOklch(e.target.value));
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        className="w-7 h-7 rounded-md border border-border-glass shrink-0 cursor-pointer shadow-sm"
        style={{ backgroundColor: hexValue }}
        onClick={() => colorInputRef.current?.click()}
        aria-label={`Wybierz kolor: ${label}`}
      >
        <input
          ref={colorInputRef}
          type="color"
          value={hexValue}
          onChange={handleColorPickerChange}
          className="sr-only"
          tabIndex={-1}
        />
      </button>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-foreground truncate">{label}</span>
          <Input
            value={hexValue}
            onChange={handleHexChange}
            className="h-6 w-20 px-1.5 text-2xs font-mono shrink-0"
          />
        </div>
        <span className="text-[10px] text-muted-foreground/60 font-mono truncate">
          {variableName}: {value}
        </span>
      </div>
    </div>
  );
}
