import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookmarkPlus, Link2, ImageIcon, Loader2 } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { toast } from 'sonner';
import type { AnimeStatus } from '@shiroani/shared';
import { STATUS_CONFIG } from '@/lib/constants';
import { SCRAPE_METADATA_SCRIPT } from '@/lib/scrape-metadata';

const ADD_STATUSES: AnimeStatus[] = ['watching', 'plan_to_watch', 'on_hold'];
const STATUS_OPTIONS = ADD_STATUSES.map(value => ({
  value,
  label: STATUS_CONFIG[value].label,
}));

interface AddToLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function AddToLibraryDialog({ open, onOpenChange, url, title }: AddToLibraryDialogProps) {
  const { addToLibrary } = useLibraryStore();

  const [editableTitle, setEditableTitle] = useState('');
  const [status, setStatus] = useState<AnimeStatus>('plan_to_watch');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [coverImage, setCoverImage] = useState('');
  const [isFetchingCover, setIsFetchingCover] = useState(false);

  // Reset form and auto-fetch cover when dialog opens
  useEffect(() => {
    if (open) {
      setEditableTitle(title || '');
      setStatus('plan_to_watch');
      setCurrentEpisode(0);
      setTotalEpisodes(0);
      setCoverImage('');
      setIsFetchingCover(false);

      // Auto-fetch metadata (cover, title, episodes) from the current tab
      const activeTabId = useBrowserStore.getState().activeTabId;
      if (activeTabId) {
        setIsFetchingCover(true);
        window.electronAPI?.browser
          ?.executeScript(activeTabId, SCRAPE_METADATA_SCRIPT)
          .then(result => {
            const meta = result as {
              coverImage?: string;
              title?: string;
              episodes?: number;
            } | null;
            if (meta) {
              if (meta.coverImage) setCoverImage(meta.coverImage);
              if (meta.title) setEditableTitle(meta.title);
              if (meta.episodes && meta.episodes > 0) setTotalEpisodes(meta.episodes);
            }
          })
          .catch(() => {
            // Non-critical — user can fill in manually
          })
          .finally(() => {
            setIsFetchingCover(false);
          });
      }
    }
  }, [open, title]);

  const handleAdd = useCallback(() => {
    if (!editableTitle.trim()) {
      toast.error('Tytul nie moze byc pusty');
      return;
    }

    addToLibrary({
      title: editableTitle.trim(),
      status,
      currentEpisode: currentEpisode > 0 ? currentEpisode : undefined,
      episodes: totalEpisodes > 0 ? totalEpisodes : undefined,
      coverImage: coverImage.trim() || undefined,
      resumeUrl: url || undefined,
    });

    toast.success('Dodano do biblioteki', {
      description: editableTitle.trim(),
    });

    onOpenChange(false);
  }, [
    editableTitle,
    status,
    currentEpisode,
    totalEpisodes,
    coverImage,
    url,
    addToLibrary,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-primary" />
            Dodaj do biblioteki
          </DialogTitle>
          <DialogDescription>
            Zapisz biezaca strone w bibliotece, aby moc do niej wrocic pozniej.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cover image preview + URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Okladka</label>
            <div className="flex items-start gap-3">
              {/* Thumbnail preview */}
              <div className="w-16 h-[86px] rounded-md border border-border overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {isFetchingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : coverImage ? (
                  <img
                    src={coverImage}
                    alt="Okladka"
                    className="w-full h-full object-cover"
                    onError={() => setCoverImage('')}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Input
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="URL obrazka okladki..."
                  className="h-7 text-xs truncate"
                />
                <p className="text-[10px] text-muted-foreground/50">
                  {isFetchingCover
                    ? 'Pobieranie okladki ze strony...'
                    : coverImage
                      ? 'Pobrano automatycznie ze strony'
                      : 'Wklej URL lub zostaw puste'}
                </p>
              </div>
            </div>
          </div>

          {/* URL display */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Adres URL</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border min-w-0 overflow-hidden">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{url || 'Brak URL'}</span>
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tytul</label>
            <Input
              value={editableTitle}
              onChange={e => setEditableTitle(e.target.value)}
              placeholder="Wpisz tytul..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Status select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={v => setStatus(v as AnimeStatus)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Episodes row */}
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Biezacy odcinek</label>
              <Input
                type="number"
                min={0}
                value={currentEpisode}
                onChange={e => setCurrentEpisode(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 text-sm w-24"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Liczba odcinkow</label>
              <Input
                type="number"
                min={0}
                value={totalEpisodes}
                onChange={e => setTotalEpisodes(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="?"
                className="h-8 text-sm w-24"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!editableTitle.trim()}>
            <BookmarkPlus className="w-4 h-4" />
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
