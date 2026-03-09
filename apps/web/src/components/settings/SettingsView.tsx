import { useState, useEffect } from 'react';
import { Palette, Globe, Download, Info, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { BrowserSection } from '@/components/settings/BrowserSection';
import { UpdatesSection } from '@/components/settings/UpdatesSection';
import { AboutSection } from '@/components/settings/AboutSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';

type SettingsSection = 'appearance' | 'browser' | 'notifications' | 'updates' | 'about';

const SECTIONS: { id: SettingsSection; label: string; Icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Wyglad', Icon: Palette },
  { id: 'browser', label: 'Przegladarka', Icon: Globe },
  { id: 'notifications', label: 'Powiadomienia', Icon: Bell },
  { id: 'updates', label: 'Aktualizacje', Icon: Download },
  { id: 'about', label: 'O aplikacji', Icon: Info },
];

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [version, setVersion] = useState('');

  // Fetch app version once for both UpdatesSection and AboutSection
  useEffect(() => {
    window.electronAPI?.app?.getVersion().then(v => setVersion(v));
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden animate-fade-in">
      {/* Section navigation */}
      <div className="w-44 shrink-0 border-r border-border bg-card/30 p-3 space-y-0.5">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
              'transition-all duration-150',
              activeSection === section.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <section.Icon className="w-4 h-4 shrink-0" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl">
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'browser' && <BrowserSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'updates' && <UpdatesSection version={version} />}
          {activeSection === 'about' && <AboutSection version={version} />}
        </div>
      </div>
    </div>
  );
}
