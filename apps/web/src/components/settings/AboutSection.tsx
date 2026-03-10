import { ExternalLink } from 'lucide-react';
import { APP_NAME, GITHUB_RELEASES_URL } from '@shiroani/shared';
import { APP_LOGO_URL } from '@/lib/constants';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

interface AboutSectionProps {
  version: string;
}

export function AboutSection({ version }: AboutSectionProps) {
  return (
    <div className="space-y-4">
      {/* App info - hero glass card */}
      <SettingsCard>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-border-glass flex items-center justify-center overflow-hidden">
            <img
              src={APP_LOGO_URL}
              alt="ShiroAni"
              className="w-12 h-12 object-contain"
              draggable={false}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{APP_NAME}</h2>
            <p className="text-xs text-muted-foreground">Wersja {version || '...'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Przeglądarka i tracker anime w jednym miejscu
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Links */}
      <SettingsCard className="p-2">
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            if (window.electronAPI?.browser) {
              useBrowserStore.getState().openTab(GITHUB_RELEASES_URL);
            } else {
              window.open(GITHUB_RELEASES_URL, '_blank');
            }
          }}
          className="flex items-center gap-2.5 text-sm text-muted-foreground p-3 rounded-lg hover:bg-accent/50 hover:text-primary transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          GitHub
        </a>
      </SettingsCard>

      {/* License */}
      <SettingsCard>
        <h3 className="text-sm font-medium mb-1">Licencja</h3>
        <p className="text-2xs text-muted-foreground/70">Source Available License</p>
      </SettingsCard>
    </div>
  );
}
