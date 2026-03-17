import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, setSetting } from '@/lib/db-queries';

// ============================================
// Types
// ============================================

export interface QuickAccessSite {
  id: string;
  name: string;
  url: string;
  icon?: string;
  isPredefined?: boolean;
}

export interface FrequentSite {
  url: string;
  title: string;
  favicon?: string;
  visitCount: number;
  lastVisited: number;
}

// ============================================
// Constants
// ============================================

const SITES_KEY = 'quick-access-sites';
const FREQUENT_KEY = 'quick-access-frequent';
const MAX_FREQUENT_SITES = 8;

const faviconUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export const PREDEFINED_SITES: QuickAccessSite[] = [
  {
    id: 'predefined-ogladajanime',
    name: 'Oglądaj Anime',
    url: 'https://ogladajanime.pl',
    icon: faviconUrl('ogladajanime.pl'),
    isPredefined: true,
  },
  {
    id: 'predefined-shinden',
    name: 'Shinden',
    url: 'https://shinden.pl',
    icon: faviconUrl('shinden.pl'),
    isPredefined: true,
  },
  {
    id: 'predefined-anilist',
    name: 'AniList',
    url: 'https://anilist.co',
    icon: faviconUrl('anilist.co'),
    isPredefined: true,
  },
  {
    id: 'predefined-myanimelist',
    name: 'MyAnimeList',
    url: 'https://myanimelist.net',
    icon: faviconUrl('myanimelist.net'),
    isPredefined: true,
  },
  {
    id: 'predefined-youtube',
    name: 'YouTube',
    url: 'https://youtube.com',
    icon: faviconUrl('youtube.com'),
    isPredefined: true,
  },
];

// ============================================
// Hook
// ============================================

export function useQuickAccess() {
  const db = useSQLiteContext();
  const [customSites, setCustomSites] = useState<QuickAccessSite[]>([]);
  const [hiddenPredefinedIds, setHiddenPredefinedIds] = useState<string[]>([]);
  const [frequentSites, setFrequentSites] = useState<FrequentSite[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from SQLite on mount
  useEffect(() => {
    (async () => {
      try {
        const sitesJson = await getSetting(db, SITES_KEY);
        if (sitesJson) {
          const parsed = JSON.parse(sitesJson);
          setCustomSites(parsed.sites ?? []);
          setHiddenPredefinedIds(parsed.hiddenPredefinedIds ?? []);
        }
        const frequentJson = await getSetting(db, FREQUENT_KEY);
        if (frequentJson) {
          setFrequentSites(JSON.parse(frequentJson));
        }
      } catch {
        // Ignore parse errors
      }
      setLoaded(true);
    })();
  }, [db]);

  // Persist helpers
  const persistSites = useCallback(
    async (sites: QuickAccessSite[], hidden: string[]) => {
      await setSetting(db, SITES_KEY, JSON.stringify({ sites, hiddenPredefinedIds: hidden }));
    },
    [db]
  );

  const persistFrequent = useCallback(
    async (sites: FrequentSite[]) => {
      await setSetting(db, FREQUENT_KEY, JSON.stringify(sites));
    },
    [db]
  );

  // Actions
  const addSite = useCallback(
    async (name: string, rawUrl: string) => {
      const url = rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`;
      let icon: string | undefined;
      try {
        icon = faviconUrl(new URL(url).hostname);
      } catch {
        // skip
      }
      const newSite: QuickAccessSite = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        url,
        icon,
      };
      const updated = [...customSites, newSite];
      setCustomSites(updated);
      await persistSites(updated, hiddenPredefinedIds);
    },
    [customSites, hiddenPredefinedIds, persistSites]
  );

  const removeSite = useCallback(
    async (id: string) => {
      const updated = customSites.filter(s => s.id !== id);
      setCustomSites(updated);
      await persistSites(updated, hiddenPredefinedIds);
    },
    [customSites, hiddenPredefinedIds, persistSites]
  );

  const hidePredefined = useCallback(
    async (id: string) => {
      const updated = [...hiddenPredefinedIds, id];
      setHiddenPredefinedIds(updated);
      await persistSites(customSites, updated);
    },
    [customSites, hiddenPredefinedIds, persistSites]
  );

  const showPredefined = useCallback(
    async (id: string) => {
      const updated = hiddenPredefinedIds.filter(h => h !== id);
      setHiddenPredefinedIds(updated);
      await persistSites(customSites, updated);
    },
    [customSites, hiddenPredefinedIds, persistSites]
  );

  const recordVisit = useCallback(
    async (url: string, title: string) => {
      if (!url || url === 'about:blank') return;

      let normalizedUrl: string;
      let favicon: string | undefined;
      try {
        const parsed = new URL(url);
        normalizedUrl = `${parsed.origin}${parsed.pathname}`;
        favicon = faviconUrl(parsed.hostname);
      } catch {
        normalizedUrl = url;
      }

      setFrequentSites(prev => {
        const existing = prev.find(s => s.url === normalizedUrl);
        let updated: FrequentSite[];

        if (existing) {
          updated = prev.map(s =>
            s.url === normalizedUrl
              ? {
                  ...s,
                  title: title || s.title,
                  favicon: favicon || s.favicon,
                  visitCount: s.visitCount + 1,
                  lastVisited: Date.now(),
                }
              : s
          );
        } else {
          updated = [
            ...prev,
            {
              url: normalizedUrl,
              title: title || normalizedUrl,
              favicon,
              visitCount: 1,
              lastVisited: Date.now(),
            },
          ];
        }

        updated.sort((a, b) => b.visitCount - a.visitCount);
        updated = updated.slice(0, MAX_FREQUENT_SITES);

        persistFrequent(updated);
        return updated;
      });
    },
    [persistFrequent]
  );

  // Computed: visible sites
  const visiblePredefined = PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id));
  const sites = [...visiblePredefined, ...customSites];
  const hiddenPredefined = PREDEFINED_SITES.filter(s => hiddenPredefinedIds.includes(s.id));

  return {
    sites,
    customSites,
    frequentSites,
    hiddenPredefined,
    loaded,
    addSite,
    removeSite,
    hidePredefined,
    showPredefined,
    recordVisit,
  };
}
