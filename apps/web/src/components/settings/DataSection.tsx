import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';

export function DataSection() {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Download}
        title="Eksportuj dane"
        subtitle="Eksportuj wszystkie dane z aplikacji do pliku JSON"
      >
        <Button
          variant="outline"
          size="sm"
          className="border-border-glass"
          onClick={() => setExportOpen(true)}
        >
          <Download className="w-4 h-4" />
          Eksportuj wszystko
        </Button>
      </SettingsCard>

      <SettingsCard
        icon={Upload}
        title="Importuj dane"
        subtitle="Importuj dane z pliku JSON do aplikacji"
      >
        <Button
          variant="outline"
          size="sm"
          className="border-border-glass"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="w-4 h-4" />
          Importuj
        </Button>
      </SettingsCard>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="all" />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="all" />
    </div>
  );
}
