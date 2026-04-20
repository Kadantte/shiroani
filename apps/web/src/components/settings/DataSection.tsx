import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Book,
  Download,
  Info,
  Pencil,
  Settings as SettingsIcon,
  Upload,
} from 'lucide-react';
import { pluralize } from '@shiroani/shared';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useDiaryStore } from '@/stores/useDiaryStore';

export function DataSection() {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const libraryCount = useLibraryStore(s => s.entries.length);
  const diaryCount = useDiaryStore(s => s.entries.length);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Download}
        title="Eksportuj dane"
        subtitle="Zapisz wszystkie dane z aplikacji do pliku JSON."
        tone="green"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ExportScopeTile
            icon={Book}
            label="Biblioteka"
            value={pluralize(libraryCount, 'tytuł', 'tytuły', 'tytułów')}
          />
          <ExportScopeTile
            icon={Pencil}
            label="Pamiętnik"
            value={pluralize(diaryCount, 'wpis', 'wpisy', 'wpisów')}
          />
          <ExportScopeTile icon={SettingsIcon} label="Ustawienia" value="Wszystkie" />
        </div>
        <Button variant="default" size="sm" onClick={() => setExportOpen(true)} className="gap-2">
          <Download className="h-4 w-4" />
          Eksportuj wszystko
        </Button>
      </SettingsCard>

      <SettingsCard
        icon={Upload}
        title="Importuj dane"
        subtitle="Wczytaj dane z pliku JSON do aplikacji."
        tone="orange"
      >
        <div className="flex items-start gap-3 rounded-lg border border-border-glass bg-background/30 px-3 py-2.5 text-[11.5px] text-muted-foreground leading-relaxed">
          <Info className="w-4 h-4 text-muted-foreground/80 mt-0.5 shrink-0" />
          <p>
            <b className="font-semibold text-foreground">Uwaga:</b> Import nadpisuje istniejące
            dane. Zalecamy najpierw wykonać eksport jako kopię zapasową.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border-glass gap-2"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="w-4 h-4" />
          Wybierz plik JSON
        </Button>
      </SettingsCard>

      {/* Danger zone — destructive tone with tinted surface */}
      <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] px-5 py-4 space-y-3.5">
        <div className="flex items-start gap-3 pb-3 border-b border-destructive/15">
          <div className="size-[38px] rounded-[10px] grid place-items-center flex-shrink-0 border border-destructive/30 bg-destructive/15 text-destructive">
            <AlertTriangle className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-serif font-bold text-[16px] leading-tight tracking-[-0.01em] text-destructive">
              Usuń wszystkie dane
            </h3>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-snug">
              Nieodwracalne usunięcie danych aplikacji.
            </p>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
          Operacja usunie bibliotekę, pamiętnik, subskrypcje i ustawienia. Nie można jej cofnąć.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled
        >
          Usuń wszystkie dane
        </Button>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="all" />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="all" />
    </div>
  );
}

interface ExportScopeTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function ExportScopeTile({ icon: Icon, label, value }: ExportScopeTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-glass bg-background/30 px-3 py-2.5">
      <span className="grid size-9 flex-shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-foreground">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}
