import { useCallback } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { emitWithErrorHandling } from '@/lib/socket';
import { ImportExportEvents, type ExportRequest, type ExportResponse } from '@shiroani/shared';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'library' | 'diary' | 'all';
  selectedIds?: number[];
}

type ExportState =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'success'; data: ExportResponse }
  | { step: 'error'; message: string }
  | { step: 'saving' }
  | { step: 'saved' }
  | { step: 'save-error'; message: string };

const EXPORT_FILENAME: Record<string, string> = {
  library: 'shiroani_library.json',
  diary: 'shiroani_diary.json',
  all: 'shiroani_all.json',
};

export function ExportDialog({ open, onOpenChange, type, selectedIds }: ExportDialogProps) {
  const { state, transition, reset } = useDialogStateMachine<ExportState>({ step: 'idle' });

  const handleExport = useCallback(async () => {
    transition({ step: 'loading' });
    try {
      const response = await emitWithErrorHandling<ExportRequest, ExportResponse>(
        ImportExportEvents.EXPORT,
        { type, ids: selectedIds }
      );
      transition({ step: 'success', data: response });
    } catch (err) {
      transition({
        step: 'error',
        message: err instanceof Error ? err.message : 'Nieznany błąd',
      });
    }
  }, [type, selectedIds, transition]);

  const handleSave = useCallback(async () => {
    if (state.step !== 'success') return;

    const { data } = state;
    transition({ step: 'saving' });

    try {
      const filePath = await window.electronAPI?.dialog?.saveFile?.({
        title: 'Eksportuj dane ShiroAni',
        defaultPath: EXPORT_FILENAME[type] ?? 'shiroani_export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) {
        // User cancelled — go back to success state
        transition({ step: 'success', data });
        return;
      }

      await window.electronAPI?.file?.writeJson(filePath, JSON.stringify(data.data, null, 2));
      transition({ step: 'saved' });
    } catch (err) {
      transition({
        step: 'save-error',
        message: err instanceof Error ? err.message : 'Nie udało się zapisać pliku',
      });
    }
  }, [state, transition]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        reset();
      }
      onOpenChange(value);
    },
    [onOpenChange, reset]
  );

  // Trigger export when dialog opens
  const handleDialogOpen = useCallback(() => {
    if (state.step === 'idle') {
      handleExport();
    }
  }, [state.step, handleExport]);

  // Auto-start export when opened
  if (open && state.step === 'idle') {
    handleExport();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onOpenAutoFocus={handleDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Eksportuj dane
          </DialogTitle>
          <DialogDescription>Eksportuj dane z aplikacji do pliku JSON</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading */}
          {state.step === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Przygotowywanie danych...</span>
            </div>
          )}

          {/* Success - show count */}
          {state.step === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <p className="text-sm text-foreground">
                Wyeksportowano <span className="font-semibold">{state.data.totalExported}</span>{' '}
                elementów
              </p>
            </div>
          )}

          {/* Error */}
          {state.step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400">{state.message}</p>
            </div>
          )}

          {/* Saving */}
          {state.step === 'saving' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Zapisywanie pliku...</span>
            </div>
          )}

          {/* Saved */}
          {state.step === 'saved' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <p className="text-sm text-green-400">Plik został zapisany pomyślnie</p>
            </div>
          )}

          {/* Save error */}
          {state.step === 'save-error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400">{state.message}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {state.step === 'success' && (
            <Button onClick={handleSave}>
              <Save className="w-4 h-4" />
              Zapisz jako...
            </Button>
          )}
          {(state.step === 'error' || state.step === 'saved' || state.step === 'save-error') && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Zamknij
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
