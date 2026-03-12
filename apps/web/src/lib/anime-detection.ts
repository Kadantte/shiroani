import { IS_ELECTRON } from '@/lib/platform';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import type { BrowserTab, DiscordPresenceActivity } from '@shiroani/shared';

// ── Types ─────────────────────────────────────────────────────────

export interface AnimeDetection {
  animeTitle: string;
  episodeInfo?: string;
}

// ── Pure utilities ────────────────────────────────────────────────

/**
 * Converts a URL slug to a human-readable title.
 * "naruto-shippuuden" → "Naruto Shippuuden"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Detects anime information from the current URL and page title.
 * Pure function — no DOM access, no side effects.
 */
export function detectAnimeFromUrl(url: string, pageTitle: string): AnimeDetection | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, '');

  // ── ogladajanime.pl ───────────────────────────────────────────
  if (hostname === 'ogladajanime.pl') {
    return detectOgladajAnime(parsed, pageTitle);
  }

  // ── shinden.pl ────────────────────────────────────────────────
  if (hostname === 'shinden.pl') {
    return detectShinden(parsed);
  }

  // ── youtube.com / youtu.be ────────────────────────────────────
  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be') {
    return detectYoutube(parsed, pageTitle);
  }

  return null;
}

// ── Site-specific detectors ───────────────────────────────────────

function detectOgladajAnime(parsed: URL, pageTitle: string): AnimeDetection | null {
  const path = parsed.pathname;

  // /anime/{slug}/player/{id} → watching
  const playerMatch = path.match(/^\/anime\/([^/]+)\/player\/\d+/);
  if (playerMatch) {
    return { animeTitle: slugToTitle(playerMatch[1]) };
  }

  // /anime/{slug}/{number} → watching episode N
  const episodeMatch = path.match(/^\/anime\/([^/]+)\/(\d+)/);
  if (episodeMatch) {
    return {
      animeTitle: slugToTitle(episodeMatch[1]),
      episodeInfo: `Odcinek ${episodeMatch[2]}`,
    };
  }

  // ?action=anime&subaction=watch → watching (use page title)
  if (
    parsed.searchParams.get('action') === 'anime' &&
    parsed.searchParams.get('subaction') === 'watch'
  ) {
    return { animeTitle: pageTitle || 'Anime' };
  }

  return null;
}

function detectShinden(parsed: URL): AnimeDetection | null {
  // /episode/{id}-{slug}/view/{viewId}
  const match = parsed.pathname.match(/^\/episode\/\d+-([^/]+)\/view\/\d+/);
  if (match) {
    return { animeTitle: slugToTitle(match[1]) };
  }

  return null;
}

function detectYoutube(parsed: URL, pageTitle: string): AnimeDetection | null {
  const hostname = parsed.hostname.replace(/^www\./, '');

  // youtu.be short links always have a video ID as the path
  const isWatching =
    hostname === 'youtu.be' || (parsed.pathname === '/watch' && parsed.searchParams.has('v'));

  if (!isWatching) return null;

  const title = pageTitle.replace(/\s*-\s*YouTube\s*$/, '').trim();
  return { animeTitle: title || 'YouTube' };
}

// ── Integration ───────────────────────────────────────────────────

/**
 * Checks the given tab for anime content and updates Discord Rich Presence.
 * Should be called after tab URL or title changes.
 *
 * Parameters are optional for backward compatibility — when omitted, values
 * are read from useBrowserStore / useAppStore. New callers should prefer
 * passing data explicitly to avoid coupling a lib utility to store internals.
 */
export function updateAnimePresence(
  tabId: string,
  tabs?: BrowserTab[],
  activeTabId?: string | null,
  activeView?: string
): void {
  if (!IS_ELECTRON) return;

  const _tabs = tabs ?? useBrowserStore.getState().tabs;
  const _activeTabId =
    activeTabId !== undefined ? activeTabId : useBrowserStore.getState().activeTabId;
  const _activeView = activeView ?? useAppStore.getState().activeView;

  // Only update for the active tab while the browser view is visible
  if (tabId !== _activeTabId || _activeView !== 'browser') return;

  const tab = _tabs.find(t => t.id === tabId);
  if (!tab) return;

  const detection = detectAnimeFromUrl(tab.url, tab.title);

  let siteName: string | undefined;
  try {
    siteName = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    // invalid URL
  }

  const activity: DiscordPresenceActivity = detection
    ? {
        view: 'browser',
        animeTitle: detection.episodeInfo
          ? `${detection.animeTitle} — ${detection.episodeInfo}`
          : detection.animeTitle,
        episodeNumber: detection.episodeInfo,
        siteName,
      }
    : { view: 'browser', siteName };

  window.electronAPI?.discordRpc?.updatePresence(activity);
}
