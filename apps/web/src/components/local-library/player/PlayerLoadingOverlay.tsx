import { Loader2 } from 'lucide-react';

interface PlayerLoadingOverlayProps {
  label?: string;
  sublabel?: string;
}

/**
 * Full-cover dim overlay with a centered spinner. Used for session-open and
 * mid-session seek waits. Intentionally kept minimal — the player's other
 * chrome already carries the context (title, back button).
 */
export function PlayerLoadingOverlay({ label, sublabel }: PlayerLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4 px-6">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-xl" />
          <Loader2 className="relative h-10 w-10 animate-spin text-primary" strokeWidth={1.5} />
        </div>
        {label && (
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {sublabel && <p className="mt-1 text-xs text-muted-foreground/70">{sublabel}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
