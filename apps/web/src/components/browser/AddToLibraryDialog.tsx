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

const STATUS_OPTIONS: { value: AnimeStatus; label: string }[] = [
  { value: 'watching', label: 'Ogladam' },
  { value: 'plan_to_watch', label: 'Planowane' },
  { value: 'on_hold', label: 'Wstrzymane' },
];

/** JS snippet to extract page metadata from the current tab.
 *  Returns { coverImage, title, episodes } with site-specific scrapers
 *  and a generic og:image fallback for unknown sites. */
const SCRAPE_METADATA_SCRIPT = `
(function() {
  var result = { coverImage: null, title: null, episodes: null };
  var host = location.hostname.replace('www.', '');

  // ── Site-specific scrapers ──────────────────────────────────
  if (host === 'ogladajanime.pl') {
    var img = document.querySelector('img.img-fluid.lozad.rounded.float-right');
    if (img) result.coverImage = img.getAttribute('data-src') || img.src || null;
    var h4 = document.getElementById('anime_name_id');
    if (h4) result.title = h4.textContent.trim();
    // Fallback title from the cover alt attribute
    if (!result.title && img) result.title = img.alt ? img.alt.trim() : null;
    // Parse episode count from "Odcinki: X" text
    var allP = document.querySelectorAll('p');
    for (var i = 0; i < allP.length; i++) {
      var txt = allP[i].textContent || '';
      var m = txt.match(/Odcinki:\\s*(\\d+)/i);
      if (m) { result.episodes = parseInt(m[1], 10); break; }
    }

  } else if (host === 'anilist.co') {
    var cover = document.querySelector('.cover img, img.cover');
    if (cover) result.coverImage = cover.src || null;
    var titleEl = document.querySelector('.content h1, [data-v-5776f768] h1');
    if (titleEl) result.title = titleEl.textContent.trim();
    var epLabel = document.querySelector('[class*="data-set"] .value');
    if (epLabel) {
      var epNum = parseInt(epLabel.textContent, 10);
      if (!isNaN(epNum)) result.episodes = epNum;
    }

  } else if (host === 'myanimelist.net') {
    var malImg = document.querySelector('.leftside img[itemprop="image"], td.borderClass img');
    if (malImg) result.coverImage = malImg.getAttribute('data-src') || malImg.src || null;
    var malTitle = document.querySelector('h1.title-name strong, span[itemprop="name"]');
    if (malTitle) result.title = malTitle.textContent.trim();
    var infoSpans = document.querySelectorAll('.spaceit_pad');
    for (var j = 0; j < infoSpans.length; j++) {
      if (infoSpans[j].textContent.indexOf('Episodes') !== -1) {
        var epMatch = infoSpans[j].textContent.match(/(\\d+)/);
        if (epMatch) result.episodes = parseInt(epMatch[1], 10);
        break;
      }
    }

  } else if (host === 'shinden.pl') {
    var shinImg = document.querySelector('.info-aside-img img, .title-cover img');
    if (shinImg) result.coverImage = shinImg.src || null;
    var shinTitle = document.querySelector('h1.page-title, .title-small-h3');
    if (shinTitle) result.title = shinTitle.textContent.trim();
    var dtEls = document.querySelectorAll('dt');
    for (var k = 0; k < dtEls.length; k++) {
      if (dtEls[k].textContent.indexOf('Epizody') !== -1 || dtEls[k].textContent.indexOf('Episodes') !== -1) {
        var dd = dtEls[k].nextElementSibling;
        if (dd) {
          var ep = parseInt(dd.textContent, 10);
          if (!isNaN(ep)) result.episodes = ep;
        }
        break;
      }
    }
  }

  // ── Generic fallback: og:image / twitter:image ──────────────
  if (!result.coverImage) {
    var og = document.querySelector('meta[property="og:image"]');
    result.coverImage = og ? og.content : null;
  }
  if (!result.coverImage) {
    var tw = document.querySelector('meta[name="twitter:image"]');
    result.coverImage = tw ? tw.content : null;
  }
  if (!result.title) {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) result.title = ogTitle.content || null;
  }

  return result;
})()
`;

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
