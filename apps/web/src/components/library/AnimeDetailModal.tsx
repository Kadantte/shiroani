import { useState, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Save, Trash2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { toast } from 'sonner';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';
import { STATUS_OPTIONS } from '@/lib/constants';
import { useAnimeDetailForm } from '@/hooks/useAnimeDetailForm';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { SliderInputField } from './SliderInputField';

const { updateEntry, removeFromLibrary } = useLibraryStore.getState();

interface AnimeDetailModalProps {
  entry: AnimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnimeDetailModal({ entry, open, onOpenChange }: AnimeDetailModalProps) {
  const navigateToBrowser = useNavigateToBrowser();

  const {
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    score,
    setScore,
    notes,
    setNotes,
    resumeUrl,
    setResumeUrl,
    anilistId,
    setAnilistId,
  } = useAnimeDetailForm(entry);

  const [showConfirm, setShowConfirm] = useState(false);

  const isCompleted = status === 'completed' && !!entry?.episodes && entry.episodes > 0;

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
      navigateToBrowser(entry.resumeUrl);
    } else {
      navigateToBrowser();
    }
    onOpenChange(false);
  }, [entry, navigateToBrowser, onOpenChange]);

  const handleUpdateUrl = useCallback(() => {
    if (!entry) return;

    // Get the active browser tab's URL
    const browserState = useBrowserStore.getState();
    const activeTab = browserState.tabs.find(t => t.id === browserState.activeTabId);

    if (!activeTab?.url) {
      toast.error('Nie ma otwartej karty w przeglądarce');
      return;
    }

    setResumeUrl(activeTab.url);
    toast.success('Link zaktualizowany', {
      description: activeTab.url,
    });
  }, [entry, setResumeUrl]);

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
            <label htmlFor="detail-status" className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select value={status} onValueChange={v => setStatus(v as AnimeStatus)}>
              <SelectTrigger id="detail-status" className="h-8">
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
          <SliderInputField
            label={`Postęp: ${currentEpisode} / ${entry.episodes ?? '?'} odcinków`}
            value={currentEpisode}
            onChange={setCurrentEpisode}
            min={0}
            max={maxEpisodes}
            showSlider={!!entry.episodes && entry.episodes > 0}
            disabled={isCompleted}
          />

          {/* Score */}
          <SliderInputField
            label={score > 0 ? `Ocena: ${score}/10` : 'Ocena: Brak'}
            value={score}
            onChange={setScore}
            min={0}
            max={10}
          />

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="detail-notes" className="text-xs font-medium text-muted-foreground">
              Notatki
            </label>
            <textarea
              id="detail-notes"
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
              <label
                htmlFor="detail-resume-url"
                className="text-xs font-medium text-muted-foreground"
              >
                Link do kontynuacji
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-2xs px-2 text-muted-foreground"
                onClick={handleUpdateUrl}
              >
                <Link2 className="w-3 h-3" />
                Pobierz link z przeglądarki
              </Button>
            </div>
            <Input
              id="detail-resume-url"
              value={resumeUrl}
              onChange={e => setResumeUrl(e.target.value)}
              placeholder="https://..."
              className="h-8 text-xs"
            />
          </div>

          {/* AniList ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="detail-anilist-id"
              className="text-xs font-medium text-muted-foreground"
            >
              AniList ID
            </label>
            <p className="text-2xs text-muted-foreground/70">
              Wymagane do powiadomień i odliczania odcinków
            </p>
            <Input
              id="detail-anilist-id"
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
              Otwórz
            </Button>
            <Button onClick={() => setShowConfirm(true)} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4" />
              Usuń
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Usuń z biblioteki"
        description="Czy na pewno chcesz usunąć to anime z biblioteki?"
        onConfirm={() => {
          handleRemove();
          setShowConfirm(false);
        }}
      />
    </Dialog>
  );
}
