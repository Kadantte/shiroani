import { useState, useEffect, useMemo } from 'react';
import { Palette, Globe, Download, Info, Bell, Cat, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_WINDOWS, IS_MAC } from '@/lib/platform';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { BrowserSection } from '@/components/settings/BrowserSection';
import { UpdatesSection } from '@/components/settings/UpdatesSection';
import { AboutSection } from '@/components/settings/AboutSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { MascotSection } from '@/components/settings/MascotSection';
import { DataSection } from '@/components/settings/DataSection';

type SettingsSection =
  | 'appearance'
  | 'browser'
  | 'notifications'
  | 'mascot'
  | 'data'
  | 'updates'
  | 'about';

const ALL_SECTIONS: { id: SettingsSection; label: string; Icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Wygląd', Icon: Palette },
  { id: 'browser', label: 'Przeglądarka', Icon: Globe },
  { id: 'notifications', label: 'Powiadomienia', Icon: Bell },
  { id: 'mascot', label: 'Maskotka', Icon: Cat },
  { id: 'data', label: 'Dane', Icon: Database },
  { id: 'updates', label: 'Aktualizacje', Icon: Download },
  { id: 'about', label: 'O aplikacji', Icon: Info },
];

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [version, setVersion] = useState('');

  // Show mascot section on Windows and macOS
  const SECTIONS = useMemo(
    () => ALL_SECTIONS.filter(s => s.id !== 'mascot' || IS_WINDOWS || IS_MAC),
    []
  );

  // Fetch app version once for both UpdatesSection and AboutSection
  useEffect(() => {
    window.electronAPI?.app?.getVersion().then(v => setVersion(v));
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden animate-fade-in">
      {/* Section navigation */}
      <div className="w-44 shrink-0 border-r border-border/40 p-3 space-y-0.5">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
              'transition-all duration-150',
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
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="max-w-xl">
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'browser' && <BrowserSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'mascot' && <MascotSection />}
          {activeSection === 'data' && <DataSection />}
          {activeSection === 'updates' && <UpdatesSection version={version} />}
          {activeSection === 'about' && <AboutSection version={version} />}
        </div>
      </div>
    </div>
  );
}
