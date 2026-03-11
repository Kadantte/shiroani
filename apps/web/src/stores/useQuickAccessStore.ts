import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger, isNewTabUrl } from '@shiroani/shared';
import type { QuickAccessSite, FrequentSite } from '@shiroani/shared';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';

const logger = createLogger('QuickAccessStore');

const SITES_STORE_KEY = 'quick-access-sites';
const FREQUENT_STORE_KEY = 'quick-access-frequent';
const MAX_FREQUENT_SITES = 8;

interface QuickAccessState {
  /** Custom sites added by the user */
  sites: QuickAccessSite[];
  /** IDs of predefined sites the user has hidden */
  hiddenPredefinedIds: string[];
  /** Frequently visited sites tracked automatically */
  frequentSites: FrequentSite[];
  /** Whether the store has been loaded from persistence */
  loaded: boolean;
}

interface QuickAccessActions {
  addSite: (site: Omit<QuickAccessSite, 'id'>) => void;
  removeSite: (id: string) => void;
  hidePredefined: (id: string) => void;
  showPredefined: (id: string) => void;
  recordVisit: (url: string, title: string, favicon?: string) => void;
  loadSites: () => Promise<void>;
  persistSites: () => void;
  persistFrequent: () => void;
  /** Get all visible sites: visible predefined + custom */
  getVisibleSites: () => QuickAccessSite[];
}

type QuickAccessStore = QuickAccessState & QuickAccessActions;

let sitePersistTimer: ReturnType<typeof setTimeout> | null = null;
let frequentPersistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 500;

export const useQuickAccessStore = create<QuickAccessStore>()(
  devtools(
    (set, get) => ({
      // State
      sites: [],
      hiddenPredefinedIds: [],
      frequentSites: [],
      loaded: false,

      // Actions

      addSite: site => {
        const newSite: QuickAccessSite = {
          ...site,
          id: `custom-${crypto.randomUUID()}`,
        };
        set(state => ({ sites: [...state.sites, newSite] }), undefined, 'quickAccess/addSite');
        get().persistSites();
        logger.debug(`Added custom site: ${newSite.name}`);
      },

      removeSite: id => {
        set(
          state => ({ sites: state.sites.filter(s => s.id !== id) }),
          undefined,
          'quickAccess/removeSite'
        );
        get().persistSites();
        logger.debug(`Removed site: ${id}`);
      },

      hidePredefined: id => {
        set(
          state => ({
            hiddenPredefinedIds: [...state.hiddenPredefinedIds, id],
          }),
          undefined,
          'quickAccess/hidePredefined'
        );
        get().persistSites();
        logger.debug(`Hidden predefined: ${id}`);
      },

      showPredefined: id => {
        set(
          state => ({
            hiddenPredefinedIds: state.hiddenPredefinedIds.filter(hid => hid !== id),
          }),
          undefined,
          'quickAccess/showPredefined'
        );
        get().persistSites();
        logger.debug(`Shown predefined: ${id}`);
      },

      recordVisit: (url, title, favicon) => {
        // Don't track internal URLs
        if (isNewTabUrl(url) || url === 'about:blank') return;

        // Normalize URL to origin+path (strip query/hash for grouping)
        let normalizedUrl: string;
        try {
          const parsed = new URL(url);
          normalizedUrl = `${parsed.origin}${parsed.pathname}`;
        } catch {
          normalizedUrl = url;
        }

        set(
          state => {
            const existing = state.frequentSites.find(s => s.url === normalizedUrl);
            let updated: FrequentSite[];

            if (existing) {
              updated = state.frequentSites.map(s =>
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
                ...state.frequentSites,
                {
                  url: normalizedUrl,
                  title: title || normalizedUrl,
                  favicon,
                  visitCount: 1,
                  lastVisited: Date.now(),
                },
              ];
            }

            // Sort by visit count (desc), keep top N
            updated.sort((a, b) => b.visitCount - a.visitCount);
            updated = updated.slice(0, MAX_FREQUENT_SITES);

            return { frequentSites: updated };
          },
          undefined,
          'quickAccess/recordVisit'
        );
        get().persistFrequent();
      },

      loadSites: async () => {
        try {
          const saved = await window.electronAPI?.store?.get<{
            sites: QuickAccessSite[];
            hiddenPredefinedIds: string[];
          }>(SITES_STORE_KEY);

          const frequent = await window.electronAPI?.store?.get<FrequentSite[]>(FREQUENT_STORE_KEY);

          set(
            {
              sites: saved?.sites ?? [],
              hiddenPredefinedIds: saved?.hiddenPredefinedIds ?? [],
              frequentSites: frequent ?? [],
              loaded: true,
            },
            undefined,
            'quickAccess/load'
          );

          logger.debug('Quick access data loaded');
        } catch (err) {
          logger.warn('Failed to load quick access data:', err);
          set({ loaded: true }, undefined, 'quickAccess/load:error');
        }
      },

      persistSites: () => {
        if (sitePersistTimer) clearTimeout(sitePersistTimer);
        sitePersistTimer = setTimeout(() => {
          const { sites, hiddenPredefinedIds } = get();
          window.electronAPI?.store?.set(SITES_STORE_KEY, { sites, hiddenPredefinedIds });
          logger.debug('Persisted quick access sites');
        }, PERSIST_DEBOUNCE_MS);
      },

      persistFrequent: () => {
        if (frequentPersistTimer) clearTimeout(frequentPersistTimer);
        frequentPersistTimer = setTimeout(() => {
          const { frequentSites } = get();
          window.electronAPI?.store?.set(FREQUENT_STORE_KEY, frequentSites);
          logger.debug('Persisted frequent sites');
        }, PERSIST_DEBOUNCE_MS);
      },

      getVisibleSites: () => {
        const { sites, hiddenPredefinedIds } = get();
        const visiblePredefined = PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id));
        return [...visiblePredefined, ...sites];
      },
    }),
    { name: 'quickAccess' }
  )
);
