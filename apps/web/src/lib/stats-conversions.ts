/**
 * Anime-flavored conversions for the local time-spent counters.
 *
 * Picks a yardstick (Frieren and friends) deterministically from the day-of-year
 * so the copy stays fresh without RNG flicker between renders.
 */

import type { AppStatsSnapshot } from '@shiroani/shared';
import { pluralize } from '@shiroani/shared';

export interface Yardstick {
  id: string;
  /** Polish-friendly title (uppercase / mixed-case as published). */
  title: string;
  episodes: number;
  perEpisodeMin: number;
}

/**
 * Frieren leads the rotation — most resonant in the 2024–2026 anime canon and
 * a deliberate tonal contrast to the Spy×Family-noir landing aesthetic.
 */
export const YARDSTICKS: readonly Yardstick[] = [
  { id: 'frieren', title: 'Frieren', episodes: 28, perEpisodeMin: 24 },
  { id: 'spyfamily', title: 'SPY×FAMILY', episodes: 25, perEpisodeMin: 24 },
  { id: 'cowboybop', title: 'Cowboy Bebop', episodes: 26, perEpisodeMin: 24 },
  { id: 'monogatari', title: 'Bakemonogatari', episodes: 15, perEpisodeMin: 24 },
  { id: 'evangelion', title: 'Neon Genesis Evangelion', episodes: 26, perEpisodeMin: 24 },
] as const;

export const FRIEREN: Yardstick = YARDSTICKS[0];

function dayOfYear(date: Date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86_400_000);
}

/** Yardstick for "today" — Frieren-led, rotates by day-of-year. */
export function pickYardstick(date: Date = new Date()): Yardstick {
  return YARDSTICKS[dayOfYear(date) % YARDSTICKS.length];
}

function totalSeconds(yardstick: Yardstick): number {
  return yardstick.episodes * yardstick.perEpisodeMin * 60;
}

/**
 * "to równowartość 14 odcinków SPY×FAMILY" — or, once the count blows past
 * 1.2× the full series, switch to whole-series multiples ("3 razy cały
 * Frieren") so the conversion doesn't feel arithmetic-soup.
 */
export function formatYardstick(seconds: number, yardstick: Yardstick = FRIEREN): string {
  if (seconds <= 0) {
    return `Jeszcze nie starczyło na pierwszy odcinek ${yardstick.title}`;
  }

  const seriesSeconds = totalSeconds(yardstick);
  if (seconds >= seriesSeconds * 1.2) {
    const times = Math.floor(seconds / seriesSeconds);
    return `${pluralize(times, 'raz', 'razy', 'razy')} cały ${yardstick.title}`;
  }

  const episodes = Math.max(1, Math.floor(seconds / (yardstick.perEpisodeMin * 60)));
  return `${pluralize(episodes, 'odcinek', 'odcinki', 'odcinków')} ${yardstick.title}`;
}

/** "12 godzin 34 minuty" — Polish duration string for the hero line. */
export function formatPolishDuration(seconds: number): string {
  if (seconds < 60) {
    return pluralize(Math.max(0, Math.floor(seconds)), 'sekunda', 'sekundy', 'sekund');
  }
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    return pluralize(totalMinutes, 'minuta', 'minuty', 'minut');
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) {
    const hourPart = pluralize(totalHours, 'godzina', 'godziny', 'godzin');
    if (minutes === 0) return hourPart;
    return `${hourPart} ${pluralize(minutes, 'minuta', 'minuty', 'minut')}`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const dayPart = pluralize(days, 'dzień', 'dni', 'dni');
  if (hours === 0) return dayPart;
  return `${dayPart} ${pluralize(hours, 'godzina', 'godziny', 'godzin')}`;
}

/** Days elapsed since the first session ever (returns 1 even on day-1). */
export function daysSinceCreated(snapshot: AppStatsSnapshot, now: Date = new Date()): number {
  if (!snapshot.createdAt) return 1;
  const createdMs = Date.parse(snapshot.createdAt);
  if (!Number.isFinite(createdMs)) return 1;
  const days = Math.floor((now.getTime() - createdMs) / 86_400_000);
  return Math.max(1, days + 1);
}

export interface HeroLine {
  /** "Spędziłeś tu 12h 34min — to 32 odcinki Frieren z marginesem na opening" */
  primary: string;
  /** "Aktywnie 8h 12min · 5h 03min z anime" */
  secondary: string;
}

export function buildHeroLine(snapshot: AppStatsSnapshot): HeroLine {
  const yardstick = pickYardstick();
  const open = snapshot.totals.appOpenSeconds;
  const active = snapshot.totals.appActiveSeconds;
  const watch = snapshot.totals.animeWatchSeconds;

  if (open === 0) {
    return {
      primary: 'Twoja podróż dopiero się zaczyna · zostań tu chwilę dłużej',
      secondary: '0 minut aktywności · czekamy na pierwszą sesję',
    };
  }

  return {
    primary: `Spędziłeś tu ${formatPolishDuration(open)} — to ${formatYardstick(active, yardstick)}`,
    secondary: `Aktywnie ${formatPolishDuration(active)} · ${formatPolishDuration(watch)} z anime`,
  };
}

// FUTURE: yearly recap reads byDay (defer until v2; daily buckets already
// preserve the year of data we need).
