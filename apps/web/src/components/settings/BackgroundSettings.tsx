import { Image } from 'lucide-react';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';
import { SettingsCard } from '@/components/settings/SettingsCard';

export function BackgroundSettings() {
  return (
    <SettingsCard
      icon={Image}
      title="Tło aplikacji"
      subtitle="Ustaw własny obrazek lub GIF jako tło interfejsu."
    >
      <BackgroundPanel variant="card" />
    </SettingsCard>
  );
}
