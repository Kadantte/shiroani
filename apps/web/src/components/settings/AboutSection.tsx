import { FolderOpen, Globe, Heart, Sparkles } from 'lucide-react';
import { APP_NAME } from '@shiroani/shared';
import { APP_LOGO_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { PillTag } from '@/components/ui/pill-tag';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { SettingsCard } from '@/components/settings/SettingsCard';

interface AboutSectionProps {
  version: string;
}

export function AboutSection({ version }: AboutSectionProps) {
  const resetOnboarding = useOnboardingStore(s => s.reset);

  return (
    <div className="space-y-4">
      {/* Hero: logo + name + version + CTA row */}
      <div className="rounded-xl border border-border-glass bg-card/40 backdrop-blur-sm px-5 py-4 space-y-3.5">
        <div className="flex items-start gap-3 pb-3 border-b border-border-glass/60">
          <div className="w-[42px] h-[42px] rounded-xl bg-primary/10 border border-border-glass flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src={APP_LOGO_URL}
              alt="Logo ShiroAni"
              className="w-9 h-9 object-contain"
              draggable={false}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-bold text-[18px] leading-tight tracking-[-0.01em] text-foreground">
              {APP_NAME}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <PillTag variant="accent">v{version || '...'}</PillTag>
              <span className="text-[11.5px] text-muted-foreground">
                Przeglądarka · tracker anime w jednym miejscu
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={resetOnboarding}>
            <Sparkles className="w-3.5 h-3.5" />
            Uruchom kreator ponownie
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass"
            onClick={() => window.open('https://github.com/Shironex/shiroani', '_blank')}
          >
            <Globe className="w-3.5 h-3.5" />
            GitHub
          </Button>
        </div>
        <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
          Po kliknięciu kreator uruchomi się od razu — Shiro-chan przeprowadzi Cię jeszcze raz!
        </p>
      </div>

      {/* Story */}
      <SettingsCard icon={Heart} title="Historia" subtitle="Stworzone z potrzeby. Od autora.">
        <div className="space-y-2.5 text-[13px] leading-[1.7] text-foreground/85">
          <p>
            ShiroAni powstało z prawdziwej potrzeby — chciałem mieć wszystko czego potrzebuję do
            oglądania anime w jednym miejscu.{' '}
            <b className="font-bold text-primary">
              Przeglądarka, biblioteka, harmonogram, pamiętnik
            </b>{' '}
            — po prostu jedno przytulne miejsce.
          </p>
          <p>
            Z czasem zacząłem dodawać coraz więcej rzeczy: maskotki, motywy, powiadomienia i po
            prostu świetnie się przy tym bawiłem. W pewnym momencie pomyślałem — czemu nie
            udostępnić tego innym?
          </p>
          <p>
            Głównym celem ShiroAni jest to, żeby każdy mógł mieć swoje unikalne, fajne doświadczenie
            z anime. A przy okazji zbudować <b className="font-bold text-primary">społeczność</b>{' '}
            osób, z którymi można pogadać o ulubionych seriach.
          </p>
        </div>
      </SettingsCard>

      {/* Logs */}
      {window.electronAPI?.app?.openLogsFolder && (
        <SettingsCard
          icon={FolderOpen}
          title="Logi aplikacji"
          subtitle="Otwórz folder z logami aplikacji w eksploratorze."
          tone="muted"
        >
          <Button
            variant="outline"
            size="sm"
            className="border-border-glass gap-2"
            onClick={() => window.electronAPI?.app?.openLogsFolder()}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Otwórz folder logów
          </Button>
        </SettingsCard>
      )}
    </div>
  );
}
