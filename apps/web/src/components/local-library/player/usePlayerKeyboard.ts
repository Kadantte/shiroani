import { useEffect } from 'react';

export interface PlayerKeyboardHandlers {
  onTogglePlay: () => void;
  onSeekDelta: (deltaSeconds: number) => void;
  onSeekToFraction: (fraction: number) => void;
  onVolumeDelta: (delta: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onCycleSubtitleTrack: () => void;
  onCycleAudioTrack: () => void;
  onSpeedDelta: (delta: 1 | -1) => void;
  onClose: () => void;
}

/** Text inputs that should swallow shortcuts instead of being hijacked. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Wires the standard video-player keyboard shortcuts to the handler surface.
 *
 * Deliberately matches the convention most users know from YouTube / MPV:
 *
 *   Space / K       play/pause
 *   ← / →           ±5s
 *   Shift+← / →     ±30s
 *   J / L           ±10s
 *   ↑ / ↓           volume ±5%
 *   M               mute
 *   F               fullscreen
 *   S               cycle subtitle tracks (incl. Off)
 *   T               cycle audio tracks
 *   0–9             seek to 0–90%
 *   < / >           speed down / up
 *   Esc             close player
 *
 * Shortcuts are disabled while an editable element has focus so the user can
 * type freely (e.g. in a hypothetical future chapter search input).
 */
export function usePlayerKeyboard(handlers: PlayerKeyboardHandlers, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          handlers.onTogglePlay();
          e.preventDefault();
          return;
        case 'ArrowLeft':
          handlers.onSeekDelta(e.shiftKey ? -30 : -5);
          e.preventDefault();
          return;
        case 'ArrowRight':
          handlers.onSeekDelta(e.shiftKey ? 30 : 5);
          e.preventDefault();
          return;
        case 'j':
        case 'J':
          handlers.onSeekDelta(-10);
          e.preventDefault();
          return;
        case 'l':
        case 'L':
          handlers.onSeekDelta(10);
          e.preventDefault();
          return;
        case 'ArrowUp':
          handlers.onVolumeDelta(0.05);
          e.preventDefault();
          return;
        case 'ArrowDown':
          handlers.onVolumeDelta(-0.05);
          e.preventDefault();
          return;
        case 'm':
        case 'M':
          handlers.onToggleMute();
          e.preventDefault();
          return;
        case 'f':
        case 'F':
          handlers.onToggleFullscreen();
          e.preventDefault();
          return;
        case 's':
        case 'S':
          handlers.onCycleSubtitleTrack();
          e.preventDefault();
          return;
        case 't':
        case 'T':
          handlers.onCycleAudioTrack();
          e.preventDefault();
          return;
        case '<':
        case ',':
          handlers.onSpeedDelta(-1);
          e.preventDefault();
          return;
        case '>':
        case '.':
          handlers.onSpeedDelta(1);
          e.preventDefault();
          return;
        case 'Escape':
          handlers.onClose();
          e.preventDefault();
          return;
      }

      // Number row 0–9 → seek to percentage.
      if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
        const digit = Number(e.key);
        handlers.onSeekToFraction(digit / 10);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
    // Handlers object changes each render but individual callbacks are stable
    // via useCallback in the caller — depending on `handlers` directly keeps
    // the hook easy to reason about.
  }, [handlers, enabled]);
}
