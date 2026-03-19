import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWatchPartyStore } from '@/stores/useWatchPartyStore';
import { cn } from '@/lib/utils';

const MAX_MEMBER_PRESETS = [2, 5, 10, 20] as const;

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const createRoom = useWatchPartyStore(s => s.createRoom);

  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [maxMembers, setMaxMembers] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Nazwa pokoju jest wymagana');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await createRoom(name.trim(), type, maxMembers);
      onOpenChange(false);
      // Reset form
      setName('');
      setType('public');
      setMaxMembers(10);
    } catch {
      setError('Nie udało się utworzyć pokoju');
    } finally {
      setIsCreating(false);
    }
  }, [name, type, maxMembers, createRoom, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Utwórz pokój</DialogTitle>
          <DialogDescription>Stwórz nowy pokój Watch Party i zaproś znajomych.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Room name */}
          <div className="space-y-1.5">
            <label htmlFor="room-name" className="text-xs font-medium text-foreground">
              Nazwa pokoju
            </label>
            <Input
              id="room-name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="np. Anime Night"
              className="h-8 text-xs"
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Room type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Typ pokoju</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('public')}
                className={cn(
                  'flex-1 h-8 rounded-md text-xs font-medium transition-colors border',
                  type === 'public'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/50 text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
                )}
              >
                Publiczny
              </button>
              <button
                type="button"
                onClick={() => setType('private')}
                className={cn(
                  'flex-1 h-8 rounded-md text-xs font-medium transition-colors border',
                  type === 'private'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/50 text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
                )}
              >
                Prywatny
              </button>
            </div>
          </div>

          {/* Max members */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Maks. uczestników</label>
            <div className="flex gap-1.5">
              {MAX_MEMBER_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxMembers(preset)}
                  className={cn(
                    'flex-1 h-8 rounded-md text-xs font-medium transition-colors border',
                    maxMembers === preset
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background/50 text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Submit */}
          <Button className="w-full" size="sm" onClick={handleCreate} disabled={isCreating}>
            {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
            Utwórz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
