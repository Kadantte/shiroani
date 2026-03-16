import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllSettings, setSetting } from '@/lib/db-queries';

export type TitleLanguage = 'romaji' | 'english' | 'native';

export interface AppSettings {
  showLabels: boolean;
  titleLanguage: TitleLanguage;
  notificationsEnabled: boolean;
}

const DEFAULTS: AppSettings = {
  showLabels: true,
  titleLanguage: 'romaji',
  notificationsEnabled: true,
};

export function useSettings() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAllSettings(db).then(raw => {
      setSettings({
        showLabels: raw.showLabels !== 'false',
        titleLanguage: (raw.titleLanguage as TitleLanguage) || 'romaji',
        notificationsEnabled: raw.notificationsEnabled !== 'false',
      });
      setLoaded(true);
    });
  }, [db]);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }));
      setSetting(db, key, String(value));
    },
    [db]
  );

  return { settings, loaded, update };
}
