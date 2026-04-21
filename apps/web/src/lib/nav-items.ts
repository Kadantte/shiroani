import type { ActiveView } from '@/stores/useAppStore';

export interface NavItem {
  id: ActiveView;
  label: string;
}

/** All navigation views in display order. Source of truth for the dock + settings toggles. */
export const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'browser', label: 'Przeglądarka' },
  { id: 'library', label: 'Biblioteka' },
  { id: 'discover', label: 'Odkrywaj' },
  { id: 'diary', label: 'Dziennik' },
  { id: 'schedule', label: 'Harmonogram' },
  { id: 'feed', label: 'Aktualności' },
  { id: 'profile', label: 'Profil' },
  { id: 'changelog', label: 'Historia' },
  { id: 'settings', label: 'Ustawienia' },
];

/** Views that cannot be hidden — settings is the escape hatch back into the toggle UI. */
export const ALWAYS_VISIBLE_VIEWS: ReadonlySet<ActiveView> = new Set(['settings']);

export function isViewToggleable(id: ActiveView): boolean {
  return !ALWAYS_VISIBLE_VIEWS.has(id);
}
