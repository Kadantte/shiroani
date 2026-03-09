import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Save, Trash2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';
import { STATUS_OPTIONS } from '@/lib/constants';

interface AnimeDetailModalProps {
  entry: AnimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnimeDetailModal({ entry, open, onOpenChange }: AnimeDetailModalProps) {
  const { updateEntry, removeFromLibrary } = useLibraryStore();
  const { openTab } = useBrowserStore();
  const navigateTo = useAppStore(s => s.navigateTo);

  const [status, setStatus] = useState<AnimeStatus>('watching');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [anilistId, setAnilistId] = useState<string>('');

  // Sync form state when entry changes
  useEffect(() => {
    if (entry) {
      setStatus(entry.status);
      setCurrentEpisode(entry.currentEpisode);
      setScore(entry.score ?? 0);
      setNotes(entry.notes ?? '');
      setResumeUrl(entry.resumeUrl ?? '');
      setAnilistId(entry.anilistId ? String(entry.anilistId) : '');
    }
  }, [entry]);

  const isCompleted = status === 'completed' && !!entry?.episodes && entry.episodes > 0;

  // Auto-set current episode to total when status is completed
  useEffect(() => {
    if (status === 'completed' && entry?.episodes && entry.episodes > 0) {
      setCurrentEpisode(entry.episodes);
    }
  }, [status, entry?.episodes]);

  const handleSave = useCallback(() => {
    if (!entry) return;
    const parsedAnilistId = anilistId.trim() ? parseInt(anilistId.trim(), 10) : null;
    updateEntry({
      id: entry.id,
      anilistId: parsedAnilistId && !isNaN(parsedAnilistId) ? parsedAnilistId : null,
      status,
      currentEpisode,
      score: score > 0 ? score : undefined,
      notes: notes.trim() || undefined,
      resumeUrl: resumeUrl.trim() || undefined,
    });
    onOpenChange(false);
  }, [
    entry,
    status,
    currentEpisode,
    score,
    notes,
    resumeUrl,
    anilistId,
    updateEntry,
    onOpenChange,
  ]);

  const handleRemove = useCallback(() => {
    if (!entry) return;
    removeFromLibrary(entry.id);
    onOpenChange(false);
  }, [entry, removeFromLibrary, onOpenChange]);

  const handleOpenInBrowser = useCallback(() => {
    if (entry?.resumeUrl) {
      openTab(entry.resumeUrl);
    } else {
      openTab(useBrowserStore.getState().getDefaultUrl());
    }
    onOpenChange(false);
    navigateTo('browser');
  }, [entry, openTab, onOpenChange, navigateTo]);

  const handleUpdateUrl = useCallback(() => {
    if (!entry) return;

    // Get the active browser tab's URL
    const browserState = useBrowserStore.getState();
    const activeTab = browserState.tabs.find(t => t.id === browserState.activeTabId);

    if (!activeTab?.url) {
      toast.error('Brak aktywnej karty przegladarki');
      return;
    }

    setResumeUrl(activeTab.url);
    toast.success('URL zaktualizowany', {
      description: activeTab.url,
    });
  }, [entry]);

  if (!entry) return null;

  const maxEpisodes = entry.episodes ?? 9999;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Banner / Cover */}
        {entry.coverImage && (
          <div className="relative -mx-6 -mt-6 mb-4 h-32 overflow-hidden rounded-t-lg">
            <img
              src={entry.coverImage}
              alt=""
              className="w-full h-full object-cover blur-sm scale-110 opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-3 left-6 flex items-end gap-3">
              <img
                src={entry.coverImage}
                alt={entry.title}
                className="w-16 h-22 rounded-md object-cover shadow-lg border border-border"
              />
              <div>
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  {entry.title}
                </h2>
                {entry.titleNative && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.titleNative}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!entry.coverImage && (
          <DialogHeader>
            <DialogTitle>{entry.title}</DialogTitle>
            {entry.titleNative && <DialogDescription>{entry.titleNative}</DialogDescription>}
          </DialogHeader>
        )}

        <div className="space-y-4">
          {/* Info badges */}
          <div className="flex flex-wrap gap-1.5">
            {entry.episodes && <Badge variant="secondary">{entry.episodes} odc.</Badge>}
            {entry.score != null && entry.score > 0 && (
              <Badge variant="secondary">Ocena: {entry.score}/10</Badge>
            )}
          </div>

          {/* Status */}
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

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Postep: {currentEpisode} / {entry.episodes ?? '?'} odcinkow
              </label>
              <Input
                type="number"
                min={0}
                max={maxEpisodes}
                value={currentEpisode}
                onChange={e =>
                  setCurrentEpisode(
                    Math.max(0, Math.min(maxEpisodes, parseInt(e.target.value) || 0))
                  )
                }
                className="w-16 h-7 text-xs text-center"
                disabled={isCompleted}
              />
            </div>
            {entry.episodes && entry.episodes > 0 && (
              <Slider
                value={[currentEpisode]}
                onValueChange={v => setCurrentEpisode(v[0])}
                min={0}
                max={entry.episodes}
                step={1}
                disabled={isCompleted}
              />
            )}
          </div>

          {/* Score */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Ocena: {score > 0 ? `${score}/10` : 'Brak'}
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                value={score}
                onChange={e => setScore(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                className="w-16 h-7 text-xs text-center"
              />
            </div>
            <Slider value={[score]} onValueChange={v => setScore(v[0])} min={0} max={10} step={1} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notatki</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Dodaj notatki..."
              rows={3}
              className={cn(
                'flex w-full rounded-md border border-input bg-transparent px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
                'resize-none'
              )}
            />
          </div>

          {/* Resume URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Link do kontynuacji
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-2xs px-2 text-muted-foreground"
                onClick={handleUpdateUrl}
              >
                <Link2 className="w-3 h-3" />
                Pobierz z przegladarki
              </Button>
            </div>
            <Input
              value={resumeUrl}
              onChange={e => setResumeUrl(e.target.value)}
              placeholder="https://..."
              className="h-8 text-xs"
            />
          </div>

          {/* AniList ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">AniList ID</label>
            <p className="text-2xs text-muted-foreground/70">
              Wymagane do powiadomien i odliczania odcinkow
            </p>
            <Input
              type="number"
              min={1}
              value={anilistId}
              onChange={e => setAnilistId(e.target.value)}
              placeholder="np. 21"
              className="h-8 text-xs w-32"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} size="sm" className="flex-1">
              <Save className="w-4 h-4" />
              Zapisz
            </Button>
            <Button onClick={handleOpenInBrowser} variant="outline" size="sm">
              <ExternalLink className="w-4 h-4" />
              Otworz
            </Button>
            <Button onClick={handleRemove} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4" />
              Usun
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
