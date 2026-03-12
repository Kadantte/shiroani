import { ExternalLink, Heart, Scale, Sparkles } from 'lucide-react';
import { APP_NAME, GITHUB_RELEASES_URL } from '@shiroani/shared';
import { APP_LOGO_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

interface AboutSectionProps {
  version: string;
}

export function AboutSection({ version }: AboutSectionProps) {
  const resetOnboarding = useOnboardingStore(s => s.reset);

  return (
    <div className="space-y-4">
      {/* App info - hero glass card */}
      <SettingsCard>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-border-glass flex items-center justify-center overflow-hidden">
            <img
              src={APP_LOGO_URL}
              alt="Logo ShiroAni"
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
        <button
          onClick={() => {
            if (window.electronAPI?.browser) {
              useBrowserStore.getState().openTab(GITHUB_RELEASES_URL);
            } else {
              window.open(GITHUB_RELEASES_URL, '_blank');
            }
          }}
          aria-label="GitHub — otwórz w nowej karcie"
          className="flex items-center gap-2.5 text-sm text-muted-foreground p-3 rounded-lg hover:bg-accent/50 hover:text-primary transition-colors cursor-pointer w-full"
        >
          <ExternalLink className="w-4 h-4" />
          GitHub
        </button>
      </SettingsCard>

      {/* Onboarding */}
      <SettingsCard
        icon={Sparkles}
        title="Kreator konfiguracji"
        subtitle="Ponownie przejdź kreator pierwszego uruchomienia"
      >
        <Button
          variant="outline"
          size="sm"
          className="border-border-glass gap-1.5"
          onClick={resetOnboarding}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Uruchom kreator ponownie
        </Button>
        <p className="text-xs text-muted-foreground/70">
          Po kliknięciu kreator uruchomi się od razu — Shiro-chan przeprowadzi Cię jeszcze raz!
        </p>
      </SettingsCard>

      {/* Story */}
      <SettingsCard icon={Heart} title="Historia" subtitle="Skąd wzięło się ShiroAni">
        <div className="space-y-2.5 text-[13px] text-muted-foreground leading-relaxed">
          <p>
            ShiroAni powstało z prostej potrzeby — chciałem mieć wszystko czego potrzebuję do
            oglądania anime w jednym miejscu. Przeglądarka, biblioteka, harmonogram, pamiętnik... po
            prostu jedno przytulne miejsce.
          </p>
          <p>
            Z czasem zacząłem dodawać coraz więcej rzeczy — maskotki, motywy, powiadomienia — i po
            prostu świetnie się przy tym bawiłem. W pewnym momencie pomyślałem: czemu nie udostępnić
            tego innym?
          </p>
          <p>
            Głównym celem ShiroAni jest to, żeby każdy mógł mieć swoje unikalne, fajne doświadczenie
            z anime. A przy okazji — zbudować społeczność osób, z którymi można pogadać o ulubionych
            seriach.
          </p>
        </div>
      </SettingsCard>

      {/* License */}
      <SettingsCard icon={Scale} title="Licencja" subtitle="Source Available License" />
    </div>
  );
}
