import { useEffect } from 'react';
import { FolderOpen, FolderPlus, HardDrive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLocalLibraryStore } from '@/stores/useLocalLibraryStore';

export function LocalLibraryView() {
  const roots = useLocalLibraryStore(s => s.roots);
  const isLoading = useLocalLibraryStore(s => s.isLoading);
  const isAddingRoot = useLocalLibraryStore(s => s.isAddingRoot);
  const error = useLocalLibraryStore(s => s.error);
  const refreshRoots = useLocalLibraryStore(s => s.refreshRoots);
  const pickAndAddRoot = useLocalLibraryStore(s => s.pickAndAddRoot);
  const removeRoot = useLocalLibraryStore(s => s.removeRoot);

  // Fetch roots on first mount — socket onConnect also triggers this but views
  // may be rendered after the socket already connected.
  useEffect(() => {
    if (roots.length === 0 && !isLoading) {
      refreshRoots();
    }
  }, [refreshRoots, roots.length, isLoading]);

  const handleAddFolder = () => {
    void pickAndAddRoot();
  };

  const hasRoots = roots.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-4 pb-3 space-y-3 border-b border-border/60 bg-card/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">
                Biblioteka lokalna
              </h1>
              <p className="text-xs text-muted-foreground/70 leading-tight">
                Importuj folder z anime z dysku
              </p>
            </div>
          </div>
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
    </div>
  );
}
