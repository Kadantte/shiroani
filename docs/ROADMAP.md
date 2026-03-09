# ShiroAni Feature Roadmap

## Overview

Planned features for ShiroAni, organized by priority and implementation order. Each feature builds on existing infrastructure (AniList API data, SQLite schema, Electron capabilities).

---

## Feature 1: Rich Anime Detail Page

**Priority:** High
**Effort:** Medium
**Status:** Planned

### Description

Replace the current minimal detail modal with a full anime detail page/panel showing all the data we already fetch from AniList but don't display.

### What We Already Have

- `ANIME_DETAILS_QUERY` fetches: description, bannerImage, studios, relations, recommendations, externalLinks, streamingEpisodes, genres, tags, season/year, status, format, episodes, duration, averageScore, popularity, source
- `AnimeDetailModal` exists but only shows basic info + library status

### Implementation Plan

- Full-width detail view (slide-in panel or dedicated route)
- Banner image header with cover overlay
- Synopsis/description section (HTML from AniList, needs sanitization)
- Info grid: format, episodes, duration, season, source, studios
- Genre/tag chips
- Score display (AniList average + user score)
- Relations section (sequels, prequels, side stories) with clickable cards
- Recommendations carousel
- External links / streaming sites ("Where to Watch")
- "Add to Library" or library status controls inline
- Link to open in browser tab

### Files to Create/Modify

- `apps/web/src/components/anime/AnimeDetailView.tsx` (new)
- `apps/web/src/components/anime/RelationCard.tsx` (new)
- `apps/web/src/components/anime/RecommendationCard.tsx` (new)
- `apps/web/src/stores/useAnimeDetailStore.ts` (new — manages detail fetching/state)
- May need to extend `ANIME_DETAILS_QUERY` if any fields are missing

---

## Feature 2: Next Episode Countdown

**Priority:** High
**Effort:** Low
**Status:** Done

### Description

Show a countdown badge on library cards for currently airing anime (e.g., "Ep 5 in 2d 4h").

### What We Already Have

- `nextAiringEpisode { airingAt, timeUntilAiring, episode }` is already in the AniList detail query response type
- Library cards (`AnimeCard.tsx`) already display status badges

### Implementation Plan

- When displaying library entries with status `watching`, check if the anime is currently airing
- Show a countdown badge: "Ep {n} in {time}" or "Airing now!" if within the hour
- Countdown should tick in real-time (update every minute via `setInterval`)
- Cross-reference library entries with schedule data (airing anime have `nextAiringEpisode`)
- Store `nextAiringEpisode` data on the library entry or fetch it separately

### Files to Create/Modify

- `apps/web/src/components/library/AnimeCard.tsx` — add countdown badge
- `apps/web/src/components/library/CountdownBadge.tsx` (new)
- May need to store airing info alongside library entries or create a lookup from schedule data

---

## Feature 3: Library Stats Dashboard

**Priority:** Medium
**Effort:** Low
**Status:** Done

### Description

Visual dashboard showing the user's library statistics.

### What We Already Have

- `LibraryService.getStats()` backend method already exists (returns counts by status)
- `LibraryService.getAllEntries()` returns all data needed for computed stats

### Implementation Plan

- Stats section at the top of LibraryView or as a dedicated sub-view
- Metrics to show:
  - Total entries, total episodes watched
  - Breakdown by status (pie/donut chart or colored bars)
  - Average score across rated entries
  - Recently updated entries
  - Most common genres (computed from library entries if genre data is stored)
- Keep it lightweight — no charting library needed, use CSS bars/segments
- Wire up a new WebSocket event or use existing `GET_ALL` response

### Files to Create/Modify

- `apps/web/src/components/library/LibraryStats.tsx` (new)
- `apps/web/src/components/library/LibraryView.tsx` — add stats toggle/section
- `apps/desktop/src/modules/library/library.gateway.ts` — add `GET_STATS` handler
- `packages/shared/src/constants/events.ts` — add `LibraryEvents.GET_STATS`

---

## Feature 4: Browser Bookmarks

**Priority:** Medium
**Effort:** Medium
**Status:** Planned

### Description

Bookmarks system for the embedded browser with folder organization.

### What We Already Have

- `bookmarks` SQLite table already exists (id, url, title, favicon, folder, created_at)
- Index on folder column
- Browser has toolbar with address bar

### Implementation Plan

- Bookmark button in browser toolbar (star icon, filled when current URL is bookmarked)
- Bookmarks sidebar panel (slide-out from left or dropdown)
- Default bookmarks for popular anime sites (ogladajanime.pl, anilist.co, myanimelist.net, etc.)
- Folder support: "Anime Sites", "Streaming", "Custom"
- Quick-add from toolbar, edit/delete from panel
- Drag to reorder (stretch goal)
- Backend: `BookmarkService` with CRUD operations
- Frontend: `useBookmarkStore` with socket events

### Files to Create/Modify

- `apps/desktop/src/modules/bookmark/` (new module — service, gateway, module)
- `apps/web/src/stores/useBookmarkStore.ts` (new)
- `apps/web/src/components/browser/BookmarkBar.tsx` (new)
- `apps/web/src/components/browser/BookmarkPanel.tsx` (new)
- `apps/web/src/components/browser/BrowserView.tsx` — add bookmark button to toolbar
- `packages/shared/src/constants/events.ts` — add `BookmarkEvents`
- `packages/shared/src/types/bookmark.ts` (new)

---

## Feature 5: Airing Notifications

**Priority:** Medium
**Effort:** Medium
**Status:** Done

### Description

Native desktop notifications when a tracked anime episode airs.

### What We Already Have

- Schedule data with `airingAt` timestamps for all airing anime
- Library entries with `watching` status
- Electron `Notification` API available in main process

### Implementation Plan

- Cross-reference library (watching status) with schedule (airing times)
- Main process service that checks upcoming airings periodically (every 5-15 min)
- When a tracked anime is about to air (configurable: 5min/15min/30min before), show native notification
- Notification includes: anime title, episode number, cover image
- Click notification to open the app / navigate to the anime
- Settings toggle to enable/disable notifications
- Settings for notification timing (how far in advance)
- Persist notification preferences in electron-store

### Files to Create/Modify

- `apps/desktop/src/main/notification-service.ts` (new)
- `apps/desktop/src/main/ipc/notifications.ts` (new — IPC handlers for settings)
- `apps/desktop/src/main/preload.ts` — expose notification settings API
- `apps/web/src/components/settings/NotificationsSection.tsx` (new)
- `apps/web/src/components/settings/SettingsView.tsx` — add notifications section

---

## Feature 6: Discover / Browse Page

**Priority:** High
**Effort:** Medium
**Status:** Planned

### Description

A browse/discover page for finding new anime with sections and filters.

### What We Already Have

- `searchAnime()`, `getTrending()`, `getPopularThisSeason()`, `getSeasonalAnime()` all implemented in AnimeService
- Gateway handlers for all of these
- AniList API supports genre/tag/year/format filtering

### Implementation Plan

- New "Discover" view accessible from sidebar (or replace/augment browser view)
- Sections:
  - "Trending Now" — horizontal scrollable row of cards
  - "Popular This Season" — row of cards
  - "Top Rated" — row of cards (needs new query: sort by SCORE_DESC)
  - "Upcoming Next Season" — row of cards
- Search bar at the top with instant search
- Filter panel: genre, year, season, format (TV/Movie/OVA), sort order
- Infinite scroll or "Load More" pagination
- Click a card to open the anime detail view (Feature 1)
- Quick "Add to Library" button on hover

### Files to Create/Modify

- `apps/web/src/components/discover/DiscoverView.tsx` (new)
- `apps/web/src/components/discover/AnimeRow.tsx` (new — horizontal scroll section)
- `apps/web/src/components/discover/AnimeSearchBar.tsx` (new)
- `apps/web/src/components/discover/FilterPanel.tsx` (new)
- `apps/web/src/stores/useDiscoverStore.ts` (new)
- `apps/web/src/App.tsx` — add Discover to sidebar navigation
- `apps/web/src/stores/useAppStore.ts` — add 'discover' to ActiveView
- May need additional AniList queries (top rated, upcoming season, genre filter)

---

## Feature 7: Global Search (Cmd+K)

**Priority:** Medium
**Effort:** Medium
**Status:** Planned

### Description

Command palette / global search that searches across library, schedule, and AniList simultaneously.

### What We Already Have

- `LibraryService.searchLibrary()` exists (searches local DB)
- `AnimeService.searchAnime()` exists (searches AniList)
- Schedule data in store

### Implementation Plan

- Cmd+K (or Ctrl+K) opens a centered command palette dialog
- Input field with instant search
- Results grouped by source:
  - "Library" — matches from local library (instant, no network)
  - "Schedule" — matches from current week's airing schedule
  - "AniList" — matches from AniList search (debounced, 300ms)
- Each result shows: cover, title, type badge (Library/Schedule/AniList)
- Keyboard navigation (arrow keys, Enter to select)
- Actions on select:
  - Library result: open detail modal
  - Schedule result: navigate to schedule view on that day
  - AniList result: open anime detail view (Feature 1)
- Quick actions: "Add to Library", "Open in Browser"

### Files to Create/Modify

- `apps/web/src/components/shared/CommandPalette.tsx` (new)
- `apps/web/src/components/shared/SearchResult.tsx` (new)
- `apps/web/src/hooks/useGlobalSearch.ts` (new)
- `apps/web/src/App.tsx` — add Cmd+K listener and render CommandPalette

---

## Implementation Order

Recommended build order based on dependencies and user impact:

```
Phase 1 (Foundation):
  1. Rich Anime Detail Page     — used by everything else
  2. Next Episode Countdown     — quick win, high visibility
  3. Library Stats Dashboard    — quick win, standalone

Phase 2 (Discovery):
  4. Discover / Browse Page     — depends on Detail Page
  5. Global Search (Cmd+K)      — depends on Detail Page

Phase 3 (Browser & Engagement):
  6. Browser Bookmarks          — standalone
  7. Airing Notifications       — depends on schedule + library
```

---

## Technical Notes

- All new WebSocket events should follow the existing pattern: define in `packages/shared/src/constants/events.ts`, handle in NestJS gateway, consume in Zustand store via `createSocketListeners`
- New views need to be added to `ActiveView` type in `useAppStore.ts` and the sidebar in `App.tsx`
- AniList API is unauthenticated (public data only) — rate limited to 90 req/min
- SQLite operations are synchronous (better-sqlite3) — keep queries simple
- Use the existing `handleGatewayRequest` pattern for all new gateway handlers
