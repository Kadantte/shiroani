import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Trash2, Check, X } from 'lucide-react';
import {
  getLogBuffer,
  subscribeToLogBuffer,
  clearLogBuffer,
  type LogEntry,
} from '@shiroani/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DevLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
  error: 'bg-destructive/15 text-destructive',
  warn: 'bg-[oklch(0.8_0.14_70/0.15)] text-[oklch(0.8_0.14_70)]',
  info: 'bg-primary/15 text-primary',
  debug: 'bg-foreground/[0.08] text-muted-foreground',
};

export function DevLogsDialog({ open, onOpenChange }: DevLogsDialogProps) {
  const [entries, setEntries] = useState<readonly LogEntry[]>(() => getLogBuffer());
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setEntries(getLogBuffer());
    const unsubscribe = subscribeToLogBuffer(next => setEntries(next));
    return unsubscribe;
  }, [open]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries]);

  const formatted = useMemo(() => entries.map(formatLine).join('\n'), [entries]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      await window.electronAPI?.app?.clipboardWrite?.(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-3">
        <DialogHeader>
          <DialogTitle>Podgląd logów</DialogTitle>
          <DialogDescription>
            Ostatnie {entries.length} {entries.length === 1 ? 'wpis' : 'wpisów'} z bufora aplikacji.
            Zapisywane tylko w pamięci, nie są nigdzie wysyłane.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={entries.length === 0}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Skopiowano' : 'Kopiuj wszystko'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearLogBuffer}
            disabled={entries.length === 0}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wyczyść
          </Button>
        </div>

        <div
          ref={listRef}
          className={cn(
            'max-h-[52vh] overflow-y-auto rounded-lg border border-border-glass bg-background/40',
            'font-mono text-[11px] leading-[1.55]'
          )}
        >
          {entries.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-[12px]">
              <X className="w-4 h-4 mx-auto mb-2 opacity-50" />
              Bufor jest pusty.
            </div>
          ) : (
            <ul className="divide-y divide-border-glass/50">
              {entries.map((entry, i) => (
                <li key={i} className="flex gap-2 px-2.5 py-1.5 hover:bg-foreground/[0.02]">
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
                      LEVEL_STYLES[entry.level]
                    )}
                  >
                    {entry.level}
                  </span>
                  <span className="shrink-0 text-muted-foreground/60 tabular-nums">
                    {entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp}
                  </span>
                  <span className="shrink-0 text-muted-foreground/80">[{entry.context}]</span>
                  <span className="flex-1 break-words text-foreground/90">
                    {entry.message}
                    {entry.data !== undefined && (
                      <span className="text-muted-foreground/70">
                        {' '}
                        {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatLine(entry: LogEntry): string {
  const time = entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const base = `${time} ${level} [${entry.context}] ${entry.message}`;
  if (entry.data === undefined) return base;
  return `${base} ${typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)}`;
}
