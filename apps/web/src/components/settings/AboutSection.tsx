import { ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { APP_NAME, GITHUB_RELEASES_URL } from '@shiroani/shared';
import { APP_LOGO_URL } from '@/lib/constants';
import { useBrowserStore } from '@/stores/useBrowserStore';

interface AboutSectionProps {
  version: string;
}

export function AboutSection({ version }: AboutSectionProps) {
  return (
    <div className="space-y-6">
      {/* App info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden">
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
            Przegladarka i tracker anime na Twoj desktop
          </p>
        </div>
      </div>

      <Separator />

      {/* Links */}
      <div className="space-y-2">
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
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          GitHub
        </a>
      </div>

      <Separator />

      {/* License */}
      <div>
        <h3 className="text-sm font-medium mb-1">Licencja</h3>
        <p className="text-xs text-muted-foreground">MIT License</p>
      </div>
    </div>
  );
}
