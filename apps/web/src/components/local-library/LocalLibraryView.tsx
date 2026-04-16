import { useEffect, useRef, useState } from 'react';
import { FolderOpen, FolderPlus, HardDrive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';
import { useFfmpegStore } from '@/stores/useFfmpegStore';
import { FfmpegSetupDialog } from './ffmpeg/FfmpegSetupDialog';
import { FfmpegStatusBadge } from './ffmpeg/FfmpegStatusBadge';

export function LocalLibraryView() {
  const roots = useLocalLibraryStore(s => s.roots);
  const isLoading = useLocalLibraryStore(s => s.isLoading);
  const isAddingRoot = useLocalLibraryStore(s => s.isAddingRoot);
  const error = useLocalLibraryStore(s => s.error);
  const refreshRoots = useLocalLibraryStore(s => s.refreshRoots);
  const pickAndAddRoot = useLocalLibraryStore(s => s.pickAndAddRoot);
  const removeRoot = useLocalLibraryStore(s => s.removeRoot);

  const ffmpegInstalled = useFfmpegStore(s => s.status.installed);

  const [setupOpen, setSetupOpen] = useState(false);
  // Remember the user's intent so that completing the install flow lets us
  // automatically continue into the folder picker, instead of making them
  // click "Add Folder" a second time.
  const pendingAddRoot = useRef(false);

  // Fetch roots on first mount — socket onConnect also triggers this but views
  // may be rendered after the socket already connected.
  useEffect(() => {
    if (roots.length === 0 && !isLoading) {
      refreshRoots();
    }
  }, [refreshRoots, roots.length, isLoading]);

  const continueAddRoot = () => {
    pendingAddRoot.current = false;
    void pickAndAddRoot();
  };

  const handleAddFolder = () => {
    if (!ffmpegInstalled) {
      pendingAddRoot.current = true;
      setSetupOpen(true);
      return;
    }
    continueAddRoot();
  };

  const handleSetupOpenChange = (open: boolean) => {
    setSetupOpen(open);
    if (!open && pendingAddRoot.current && !ffmpegInstalled) {
      // User bailed out of the setup dialog — warn and drop the pending
      // add-root intent. A hard block would feel hostile; the toast makes
      // the dependency visible without being modal.
      pendingAddRoot.current = false;
      toast.warning('FFmpeg jest wymagany, zanim dodasz folder z plikami.');
    }
  };

  const handleFfmpegReady = () => {
    if (pendingAddRoot.current) {
      setSetupOpen(false);
      continueAddRoot();
    }
  };

  const hasRoots = roots.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-tight">
                Biblioteka lokalna
              </h1>
              <p className="text-xs text-muted-foreground/70 leading-tight truncate">
                Importuj folder z anime z dysku
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <FfmpegStatusBadge onClick={() => setSetupOpen(true)} />
            {hasRoots && (
              <TooltipButton
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleAddFolder}
                disabled={isAddingRoot}
                tooltip="Dodaj kolejny folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Dodaj folder
              </TooltipButton>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {!hasRoots && (
          <EmptyState
            icon={FolderOpen}
            title="Brak dodanych folderów"
            subtitle="Wskaż folder z plikami .mkv / .mp4, aby zacząć budować bibliotekę lokalną."
            action={{
              label: isAddingRoot ? 'Dodawanie...' : 'Dodaj folder',
              onClick: handleAddFolder,
              icon: FolderPlus,
            }}
          />
        )}

        {hasRoots && (
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
                Foldery ({roots.length})
              </h2>
              <ul className="flex flex-wrap gap-2">
                {roots.map(root => (
                  <li
                    key={root.id}
                    className="group flex items-center gap-2 rounded-full border border-border/60 bg-card/40 pl-3 pr-1 py-1 text-xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                    <span className="max-w-[320px] truncate text-foreground/80" title={root.path}>
                      {root.label ?? root.path}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
                      onClick={() => void removeRoot(root.id)}
                      aria-label={`Usuń folder ${root.label ?? root.path}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/30 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground/80">
                Brak serii — skanowanie folderów pojawi się w kolejnej fazie.
              </p>
            </div>
          </div>
        )}
      </div>

      <FfmpegSetupDialog
        open={setupOpen}
        onOpenChange={handleSetupOpenChange}
        onReady={handleFfmpegReady}
      />
    </div>
  );
}
