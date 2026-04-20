import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ChangelogView } from './ChangelogView';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ChangelogDialog — same content as `ChangelogView` but rendered in a modal
 * sheet. Use this when the changelog is triggered from Settings / About or an
 * update-available toast. For a dockable top-level view, render
 * `ChangelogView` directly.
 */
export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(85vh,780px)] max-h-[85vh] w-[min(96vw,960px)] max-w-none flex-col overflow-hidden p-0 sm:rounded-xl">
        {/* Visually hidden title + description — Radix requires both for a11y */}
        <DialogTitle className="sr-only">Lista zmian ShiroAni</DialogTitle>
        <DialogDescription className="sr-only">
          Oś czasu wydań, poprawek i nowych funkcji wprowadzonych w aplikacji.
        </DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col">
          <ChangelogView compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}
