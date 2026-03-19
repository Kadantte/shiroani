import { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Globe,
  Download,
  Info,
  Bell,
  Cat,
  Database,
  MessageCircle,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_WINDOWS, IS_MAC } from '@/lib/platform';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { BrowserSection } from '@/components/settings/BrowserSection';
import { UpdatesSection } from '@/components/settings/UpdatesSection';
import { AboutSection } from '@/components/settings/AboutSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { MascotSection } from '@/components/settings/MascotSection';
import { DataSection } from '@/components/settings/DataSection';
import { DiscordSection } from '@/components/settings/DiscordSection';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { IS_ELECTRON } from '@/lib/platform';

type SettingsSection =
  | 'account'
  | 'general'
  | 'appearance'
  | 'browser'
  | 'notifications'
  | 'discord'
  | 'mascot'
  | 'data'
  | 'updates'
  | 'about';

const ALL_SECTIONS: { id: SettingsSection; label: string; Icon: typeof Palette }[] = [
  { id: 'account', label: 'Konto', Icon: User },
  { id: 'general', label: 'Ogólne', Icon: Settings },
  { id: 'appearance', label: 'Wygląd', Icon: Palette },
  { id: 'browser', label: 'Przeglądarka', Icon: Globe },
  { id: 'notifications', label: 'Powiadomienia', Icon: Bell },
  { id: 'discord', label: 'Discord', Icon: MessageCircle },
  { id: 'mascot', label: 'Maskotka', Icon: Cat },
  { id: 'data', label: 'Dane', Icon: Database },
  { id: 'updates', label: 'Aktualizacje', Icon: Download },
  { id: 'about', label: 'O aplikacji', Icon: Info },
];

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [version, setVersion] = useState('');

  // Filter platform-specific sections
  const SECTIONS = useMemo(
    () =>
      ALL_SECTIONS.filter(s => {
        if (s.id === 'mascot') return IS_WINDOWS || IS_MAC;
        if (s.id === 'general') return IS_ELECTRON;
        return true;
      }),
    []
  );

  // Fetch app version once for both UpdatesSection and AboutSection
  useEffect(() => {
    let mounted = true;
    window.electronAPI?.app?.getVersion().then(v => {
      if (!mounted) return;
      if (v) setVersion(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden animate-fade-in">
      {/* Section navigation */}
      <div
        className="w-44 shrink-0 border-r border-border/40 p-3 space-y-0.5"
        role="tablist"
        aria-label="Sekcje ustawień"
      >
        {SECTIONS.map(section => (
          <button
            key={section.id}
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
              'transition-all duration-150',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              activeSection === section.id
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground/80'
            )}
          >
            <section.Icon className="w-4 h-4 shrink-0" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div
        className="flex-1 overflow-y-auto p-6 pb-20"
        role="tabpanel"
        aria-label={SECTIONS.find(s => s.id === activeSection)?.label}
      >
        <div className="max-w-xl">
          {activeSection === 'account' && <AccountSection />}
          {activeSection === 'general' && <GeneralSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'browser' && <BrowserSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'discord' && <DiscordSection />}
          {activeSection === 'mascot' && <MascotSection />}
          {activeSection === 'data' && <DataSection />}
          {activeSection === 'updates' && <UpdatesSection version={version} />}
          {activeSection === 'about' && <AboutSection version={version} />}
        </div>
      </div>
    </div>
  );
}
