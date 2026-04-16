import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Loader2, Terminal, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFfmpegStore } from '@/stores/useFfmpegStore';

interface FfmpegSystemPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires when the user successfully saves system paths. */
  onSaved?: () => void;
}

/**
 * Sub-dialog that lets the user point ShiroAni at an existing system ffmpeg
 * install (Homebrew, Scoop, winget, manual install, …). Both binaries are
 * validated by the main process before anything is persisted — a bad path
 * surfaces an inline error here rather than silently breaking later phases.
 */
export function FfmpegSystemPathDialog({
  open,
  onOpenChange,
  onSaved,
}: FfmpegSystemPathDialogProps) {
  const status = useFfmpegStore(s => s.status);
  const setSystemPaths = useFfmpegStore(s => s.setSystemPaths);

  const [ffmpegPath, setFfmpegPath] = useState('');
  const [ffprobePath, setFfprobePath] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed with the previously-saved paths so re-opening the dialog is a tweak
  // flow rather than a re-entry flow.
  useEffect(() => {
    if (!open) return;
    setFfmpegPath(status.mode === 'system' && status.ffmpegPath ? status.ffmpegPath : '');
    setFfprobePath(status.mode === 'system' && status.ffprobePath ? status.ffprobePath : '');
    setError(null);
  }, [open, status.mode, status.ffmpegPath, status.ffprobePath]);

  const handlePick = useCallback(async (kind: 'ffmpeg' | 'ffprobe') => {
    if (!window.shiroaniLocalLibrary?.pickFile) return;

    // Windows ships the binaries as .exe, every Unix platform as plain
    // executables. Allowing "all files" as the last filter keeps things
    // flexible for users with renamed binaries.
    const extensions = window.electronAPI?.platform === 'win32' ? ['exe'] : ['*'];
    const result = await window.shiroaniLocalLibrary.pickFile({
      title: `Wskaż plik ${kind}`,
      filters: [
        { name: kind, extensions },
        { name: 'Wszystkie pliki', extensions: ['*'] },
      ],
    });
    if (result.cancelled || !result.path) return;
    if (kind === 'ffmpeg') setFfmpegPath(result.path);
    else setFfprobePath(result.path);
  }, []);

  const handleSave = useCallback(async () => {
    if (!ffmpegPath.trim() || !ffprobePath.trim()) {
      setError('Wskaż oba pliki — ffmpeg i ffprobe.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await setSystemPaths(ffmpegPath.trim(), ffprobePath.trim());
    setSaving(false);
    if (result?.success) {
      onSaved?.();
      onOpenChange(false);
    } else {
      setError(result?.error ?? 'Nie udało się zweryfikować podanych plików.');
    }
  }, [ffmpegPath, ffprobePath, setSystemPaths, onSaved, onOpenChange]);

  const canSave = ffmpegPath.trim().length > 0 && ffprobePath.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={value => (!saving ? onOpenChange(value) : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Użyj systemowego FFmpeg
          </DialogTitle>
          <DialogDescription>
            Wskaż ścieżki do plików <code className="text-xs">ffmpeg</code> i{' '}
            <code className="text-xs">ffprobe</code>. Sprawdzimy, czy działają, zanim zapiszemy
            zmiany.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <PathRow
            label="ffmpeg"
            value={ffmpegPath}
            onChange={setFfmpegPath}
            onPick={() => void handlePick('ffmpeg')}
            disabled={saving}
          />
          <PathRow
            label="ffprobe"
            value={ffprobePath}
            onChange={setFfprobePath}
            onPick={() => void handlePick('ffprobe')}
            disabled={saving}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug break-words">{error}</span>
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground/70 leading-snug">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary/50" />
            Pliki są uruchamiane lokalnie z parametrem <code>-version</code> — nic nie jest wysyłane
            do sieci.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Sprawdzanie...' : 'Zapisz i użyj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PathRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPick: () => void;
  disabled?: boolean;
}

function PathRow({ label, value, onChange, onPick, disabled }: PathRowProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
        {label}
      </span>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`/ścieżka/do/${label}`}
          spellCheck={false}
          disabled={disabled}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPick}
          disabled={disabled}
          aria-label={`Wybierz plik ${label}`}
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
      </div>
    </label>
  );
}
