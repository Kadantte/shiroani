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
import { BookmarkPlus, Link2 } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { toast } from 'sonner';
import type { AnimeStatus } from '@shiroani/shared';

const STATUS_OPTIONS: { value: AnimeStatus; label: string }[] = [
  { value: 'watching', label: 'Ogladam' },
  { value: 'plan_to_watch', label: 'Planowane' },
  { value: 'on_hold', label: 'Wstrzymane' },
];

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

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setEditableTitle(title || '');
      setStatus('plan_to_watch');
      setCurrentEpisode(0);
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
      resumeUrl: url || undefined,
    });

    toast.success('Dodano do biblioteki', {
      description: editableTitle.trim(),
    });

    onOpenChange(false);
  }, [editableTitle, status, currentEpisode, url, addToLibrary, onOpenChange]);

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
          {/* URL display */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Adres URL</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
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

          {/* Episode number */}
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
