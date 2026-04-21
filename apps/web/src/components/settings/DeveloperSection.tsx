import { useState } from 'react';
import { Terminal, SquareCode, ClipboardCopy, ScrollText, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
import { DevLogsDialog } from '@/components/settings/DevLogsDialog';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { copyDiagnosticsToClipboard } from '@/lib/diagnostics';

export function DeveloperSection() {
  const devModeEnabled = useSettingsStore(s => s.devModeEnabled);
  const setDevModeEnabled = useSettingsStore(s => s.setDevModeEnabled);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);

  const handleCopyDiagnostics = async () => {
    const ok = await copyDiagnosticsToClipboard();
    if (!ok) return;
    setDiagnosticsCopied(true);
    setTimeout(() => setDiagnosticsCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Terminal}
        title="Tryb deweloperski"
        subtitle="Narzędzia debugowania — pomocne, gdy chcesz zgłosić błąd lub zajrzeć pod maskę."
        tone="muted"
      >
        <SettingsRow>
          <SettingsRowLabel
            id="dev-mode-label"
            title="Włącz tryb deweloperski"
            description="Udostępnia narzędzia deweloperskie, podgląd logów i kopię diagnostyki."
          />
          <Switch
            checked={devModeEnabled}
            onCheckedChange={setDevModeEnabled}
            aria-labelledby="dev-mode-label"
          />
        </SettingsRow>

        {devModeEnabled && (
          <div className="grid gap-2 sm:grid-cols-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void window.electronAPI?.window?.openDevTools?.()}
              className="justify-start gap-2 text-[12px]"
            >
              <SquareCode className="w-3.5 h-3.5" />
              Narzędzia deweloperskie
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDiagnostics}
              className="justify-start gap-2 text-[12px]"
            >
              {diagnosticsCopied ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <ClipboardCopy className="w-3.5 h-3.5" />
              )}
              {diagnosticsCopied ? 'Skopiowano' : 'Kopiuj diagnostykę'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsDialogOpen(true)}
              className="justify-start gap-2 text-[12px]"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Pokaż logi
            </Button>
          </div>
        )}
      </SettingsCard>

      <DevLogsDialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen} />
    </div>
  );
}
