import { useWatchPartyStore } from '@/stores/useWatchPartyStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { WatchPartyLobby } from './WatchPartyLobby';
import { WatchPartyRoomView } from './WatchPartyRoomView';
import { CountdownOverlay } from './CountdownOverlay';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WatchPartySidebar() {
  const isOpen = useWatchPartyStore(s => s.isOpen);
  const currentRoom = useWatchPartyStore(s => s.currentRoom);
  const countdown = useWatchPartyStore(s => s.countdown);
  const closePanel = useWatchPartyStore(s => s.closePanel);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  if (isFullScreen) return null;

  return (
    <>
      {/* Countdown overlay -- shown on top of everything */}
      {countdown?.active && <CountdownOverlay countdown={countdown} />}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 w-80 z-[45]',
          'bg-card/95 backdrop-blur-md border-l border-border/40',
          'flex flex-col overflow-hidden',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Watch Party</h2>
          <button
            onClick={closePanel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content -- switches between lobby and room */}
        <div className="flex-1 overflow-hidden">
          {currentRoom ? <WatchPartyRoomView /> : <WatchPartyLobby />}
        </div>
      </aside>
    </>
  );
}
