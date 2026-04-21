# App Redesign — Handoff & Remaining Wiring

Branch: `feat/app-redesign` (7 commits, all off `master`).
Scope: desktop app renderer (`apps/web/**`). Landing page was redesigned on a
separate branch and is out of scope here.

The redesign itself is visually complete — every main view has been ported to
the new design language from `shiroani-design/` and the whole workspace
typechecks green. What remains are a handful of **data / store / IPC wires**
that the mock depicts but the app doesn't feed yet, plus the usual release QA.
This doc is the authoritative list so a fresh AI session can pick up any one
item without re-discovering context.

---

## 1. Where the design mocks live

All under `P:\shiroani\shiroani-design\` (the repo root, git-ignored):

| Mock file             | Maps to                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppRedesign.html`    | Whole-app overview — use when spot-checking cross-view consistency                                                                                                          |
| `ColorReference.html` | 17-theme palette reference (already consumed in Phase 0, revisit if tweaking tokens)                                                                                        |
| `Browser.html`        | `apps/web/src/components/browser/` — tabs, toolbar, newtab, side-detection rail                                                                                             |
| `Library.html`        | `apps/web/src/components/library/` — grid, list, detail modal                                                                                                               |
| `Schedule.html`       | `apps/web/src/components/schedule/` — day timeline, week grid, poster board                                                                                                 |
| `Diary.html`          | `apps/web/src/components/diary/` — list mode, editor page, sidebar stats                                                                                                    |
| `News.html`           | `apps/web/src/components/feed/` — hero, tile list, reader modal                                                                                                             |
| `Profile.html`        | `apps/web/src/components/profile/` — sidebar + stat grid + rings + activity feed                                                                                            |
| `Settings.html`       | `apps/web/src/components/settings/` — nav groups + cards + theme grid                                                                                                       |
| `Onboarding.html`     | `apps/web/src/components/onboarding/` — 7-step magazine                                                                                                                     |
| `Changelog.html`      | `apps/web/src/components/changelog/` — timeline                                                                                                                             |
| `shared.css`          | Source of truth for `.vh`, `.chrome`, `.dock`, `.btn-accent`, `.pill*`, `.card`, `.input`, `.app::before` noise overlay. Already translated into React primitives + tokens. |
| `Landing.html`        | **IGNORE** — already done on `feat/landing-redesign`                                                                                                                        |

Scraps / iteration sketches live in `shiroani-design/scraps/`. The `assets/`
folder contains mock screenshots (mascot poses, view previews) — some are
referenced by onboarding but **have not been copied into `apps/web/public/`**,
so mascot illustrations inside the app currently use `APP_LOGO_URL`
(`shiro-chibi.svg`).

---

## 2. What's shipped

Seven commits, each self-contained:

1. `chore: ignore shiroani-design reference folder`
2. `feat(web): new design system foundation — themes, fonts, primitives`
3. `feat(web): redesign app shell — titlebar, dock, view header, backdrop`
4. `feat(web): Phase 2 views + shell polish + bundled fonts`
5. `feat(web): Phase 3 views — Library and Profile`
6. `feat(web): Phase 4 views — Schedule, Feed, Discover + polish`
7. `feat(web): Phase 5 Diary + Phase 6 Browser + newtab polish`

### Foundation

- 17 OKLCH themes (15 dark + 2 light). Plum is the default. Old theme IDs
  (`dark`, `evangelion`, `dracula`, etc.) are auto-remapped to `plum` on load
  — no hard breakage for existing users.
- Typography bundled via `@fontsource-variable/dm-sans`,
  `@fontsource-variable/jetbrains-mono`, `@fontsource/shippori-mincho` (weights
  700 + 800). Google Fonts CDN is **not** used — the Electron CSP blocks it.
- New primitives: `PillTag`, `StatCell`, `ProgressBar`, `KanjiWatermark`,
  `ComingSoonPlaceholder`, `Timeline`. All in
  `apps/web/src/components/{ui,shared}/`.
- Restyled shadcn wrappers: button, badge, input (rest inherit new tokens).

### Shell

- `TitleBar` — 28 px chrome, centered wordmark, real window controls. No fake
  traffic-light dots.
- `NavigationDock` — floating 40×40 pill, primary-tinted active slot with
  glow. Supports bottom / top / left / right edges.
- `ViewHeader` — accepts `icon`, `title`, `subtitle`, `filters`, `searchQuery`,
  `actions`. Used by every view except Browser (custom chrome) and Diary in
  editor mode (custom back-button header).
- `AppBackground` — per-theme radial glows (`--glow-1` / `--glow-2`) + SVG
  fractal noise overlay. Sits at z=0 behind user-chosen wallpaper.

### Views

Every view under `apps/web/src/components/{library,profile,schedule,feed,discover,diary,browser,settings,onboarding,changelog}/`
was ported. Store wiring, IPC contracts, keyboard shortcuts, drag-and-drop,
and Tiptap editor engine were all preserved — only surfaces changed.

### Polish

- Global scrollbar: 10 px gutter, 6 px floating pill thumb, theme-tinted via
  `oklch(from var(--foreground) l c h / 0.15)`. Primary flash on active drag.
- Dialog a11y: `FeedReaderModal` + `ChangelogDialog` got `sr-only`
  `DialogDescription` children so Radix stops warning.
- Schedule Day view: adaptive per-hour block layout; dense clusters expand
  the hour locally, empty stretches of 3 h+ collapse into a dashed "Xh ciszy"
  marker.
- Weekly view cards got cover thumbnails (visual title scanning).
- Quick-access tiles on newtab: dropped random gradients + first-letter
  kanji; each tile now shows a 128 px favicon as a faint bottom-right overlay.
- Diary editor: was a Radix Dialog; now an inline view that replaces the
  diary body. Back button (`Powrót do dziennika`) on the top-left.
- Newtab greeting banner: time-aware "Dzień dobry / Dobry wieczór" + AniList
  display name + chibi avatar + today-in-schedule subtitle.

---

## 3. Still to wire — grouped, with references

Each item lists **what** the feature is, **which mock section** defines it,
**which files** need to change, and any **store / IPC** contract that has to
grow. Tests are deliberately NOT listed as prerequisites — user preference
is "typecheck only during feature work, run tests before PR".

### A. User identity / display name

> Mock: `Browser.html` greeting row, `Onboarding.html` step 1-ish.

**Problem.** The newtab greeting falls back silently when no AniList profile
is connected. The mock shows "Dobry wieczór, Aleks" — Aleks is a local display
name, not an AniList handle.

1. Add `displayName: string` to `useSettingsStore` (plus setter + persistence
   via `persistSetting` or localStorage, whichever the store uses).
2. Add a new onboarding step (or extend `LanguageStep.tsx`) that asks
   `Jak mam się do Ciebie zwracać?` with a text input. Skip button should be
   allowed — empty string is a valid state.
3. Update `GreetingBanner` in `apps/web/src/components/browser/NewTabPage.tsx`
   to prefer `settings.displayName` over `profile.name` / `username`.
4. Surface the same field under Settings → Ogólne so users can change it
   post-onboarding.

### B. Newtab subtitle — "Czeka na Ciebie N odcinek · M nowości w subskrypcjach"

> Mock: `Browser.html` greeting row.

Two independent data feeds:

**B1. Episodes waiting.** Count library entries in `watching` status whose
latest-aired episode (from `useScheduleStore`) > `entry.episodesWatched`.

- New selector in `useLibraryStore` or a tiny composition hook in
  `apps/web/src/hooks/useEpisodesWaiting.ts`.
- Consume in `GreetingBanner`'s subtitle.
- Subtitle format:
  `Czeka na Ciebie {N} ${pluralize(N, 'odcinek', 'odcinki', 'odcinków')}`.

**B2. Unread feed subscriptions.**

- Add `lastVisitedAt: number` to `useFeedStore` state, persisted.
- Derive `unreadCount = items.filter(i => new Date(i.publishedAt) > lastVisitedAt).length`.
- Call `markAllSeen()` when `FeedView` mounts.
- Consume in `GreetingBanner`.

When both zero, keep the existing "Miłego oglądania." fallback.

### C. Feed

> Mock: `News.html`.

**C1. Persistent per-item `isRead`.**
Today the "unread" glow in `FeedListItem` uses a top-4 positional heuristic.
Want: real per-item state.

- Extend `FeedItem` type in `packages/shared/src/types/feed.ts` with
  `readAt?: number`.
- Add `markRead(id)` and `markAllRead()` actions to `useFeedStore`.
- `FeedListItem` and `FeedReaderModal` both already call into the store;
  just add the call sites.

**C2. Bookmarks.** Button is rendered disabled in `FeedReaderModal`.

- Create `apps/web/src/stores/useFeedBookmarksStore.ts` mirroring the custom
  theme store's persistence pattern.
- Enable the bookmark button in the reader; add a "Zakładki" tab in the feed
  sidebar that filters to bookmarked items.

**C3. Full-text reader.** Current reader renders only the RSS `description`
string. The mock implies the full article body. Requires:

- Main-process fetch (`apps/desktop/src/main/` — new IPC handler
  `feed:fetchArticle`).
- HTML sanitiser on the main-process side (the web bundle intentionally
  avoids injecting raw HTML).
- Renderer: swap the `descriptionToParagraphs` helper for the sanitised
  HTML output.

### D. Profile

> Mock: `Profile.html`.

**D1. Activity feed.** Sidebar component `ActivityFeed.tsx` currently renders
`ComingSoonPlaceholder` because `UserProfile` (from
`packages/shared/src/types/anime.ts`) has no `activity[]` array — only
aggregated `statistics` and `favourites`.

- Extend `UserProfile` with `activity: ProfileActivityItem[]`.
- Each item: `{ kind: 'watched'|'rated'|'added', animeId, title, coverImage, timestamp, delta? }`.
- Main-process AniList integration (`apps/desktop/src/modules/anilist/`)
  already exposes activity in its GraphQL fragments — plumb it through.
- Replace the placeholder in `ActivityFeed.tsx`.

**D2. Share as PNG.** The header button in `ProfileView.tsx` opens
`ProfileShareDialog` (existed pre-redesign). Verify the dialog still renders
after the Profile restructure — the redesign lifted `shareOpen` state up to
`ProfileView`, so the sidebar's "Eksportuj kartę PNG" button should still
work.

### E. Browser

> Mock: `Browser.html`.

**E1. Side detection rail.** When browsing a watchable URL, a rail on the
right should show detected-anime metadata + quick "mark as watched" + next
episode countdown. Requires:

- New IPC channel `browser:detection` from main → renderer.
- `useBrowserStore` slice: `detectedAnime: DetectedAnime | null`.
- New component `BrowserDetectionRail.tsx` inside
  `apps/web/src/components/browser/`.
- Mount conditionally in `BrowserView` when `detectedAnime != null`.

**Scope note**: `AddToLibraryDialog` already covers manual detection via the
existing `SCRAPE_METADATA_SCRIPT` — the user-facing capability is there, just
not the passive rail.

**E2. PiP toggle button.** Requires a webview IPC hook
(`webview.goToPictureInPicture()`) not present in the current preload. Low
priority — most streaming sites handle PiP themselves.

### F. Schedule

> Mock: `Schedule.html`.

**F1. Library-membership color coding.** Mock section C shows event cards
tinted differently for "in library", "subscribed to notifications", or
"other". Today `WeeklyView` encodes only status (done / live / upcoming).

- `AiringAnime` (in `packages/shared/src/types/anime.ts`) doesn't carry
  `isInLibrary`. Either extend the type, or thread a `Set<number>` of
  library `anilistId`s through `WeeklyViewProps`.
- Apply the tint in `WeekEventCard` using existing PillTag-style colour
  semantics.

### G. Diary

> Mock: `Diary.html`.

**G1. Genre / Studio breakdown in sidebar.** Diary entries don't carry genre
metadata. Requires joining `entry.animeId` with library / AniList data at
render time.

- New selector in `useDiaryStore` that enriches entries with
  `entry.genres?: string[]` + `entry.studios?: string[]` by cross-referencing
  `useLibraryStore`.
- Extend `DiarySidebar` to render `GenreBreakdown` + `StudioBreakdown` rows
  from Profile pattern (already exists at
  `apps/web/src/components/profile/GenreBreakdown.tsx` + `StudioBreakdown.tsx`
  — OK to import cross-feature since they're generic).

**G2. Kalendarz + Statystyki tabs.** Optional. Mock shows three tabs
(Lista / Kalendarz / Statystyki). Today only the Lista + Grid modes exist,
via the view-mode toggle in `ViewHeader`. Decide: keep the current toggle,
or add two new tabs.

### H. Changelog

> Mock: `Changelog.html`.

**H1. Single source of truth.** `apps/web/src/lib/changelog-entries.ts`
currently mirrors `apps/landing/src/lib/releases.ts` by hand. Pick one:

- (A) Import the landing data from `@shiroani/landing-data` or a new
  `packages/changelog/` shared package. Cleanest.
- (B) Keep the mirror, add a CI check that fails if they diverge. Easy.

Current commit embeds a header comment warning "both need sync on release".

**H2. Promote to dockable view.** Currently only a `Dialog` launched from
Settings / About. Mock reads as a full article-paged view. Recommendation:

- Add `'changelog'` to the `view` union in `App.tsx:64-77` (inside the
  `navigateTo` guard).
- Add `{activeView === 'changelog' && <ChangelogView />}` after
  `SettingsView`.
- Add a nav-item to the dock with a `History` lucide icon.

### I. Settings

**I1. Destructive "Usuń wszystkie dane"** — button in `DataSection.tsx` is
disabled. Need a confirmation flow (`ConfirmDialog` with double-confirm) +
a new IPC handler that wipes `electron-store` + better-sqlite3.

**I2. UI locale.** Polish-only today. `useSettingsStore.preferredLanguage`
is **not** the UI locale — it controls anime-title rendering. If EN UI is
ever shipped, add a separate `uiLocale` setting + i18next (or similar).

### J. Onboarding

**J1. Accent-color step.** Skipped because no accent-color system exists in
the theme store. Decide: either (a) add `--primary-override` CSS var that
overlays the active theme's primary, or (b) cut the step entirely.

### L. Browser — adblock & popup customization (added session 2)

> Onboarding's AdblockStep promises **"listę wyjątków zbudujesz potem w
> ustawieniach przeglądarki"** but no such UI exists. Adblock + popup
> controls currently live as two small icons in the browser toolbar,
> which is inconsistent with every other toggleable feature (themes,
> dock, mascot — all settings-driven).

**Goal.** Move adblock + popup-blocker toggles off the browser toolbar
and into Settings → Przeglądarka, with a per-domain whitelist so users
can disable adblock on specific sites they visit.

1. Extend `useBrowserStore` with `adblockWhitelist: string[]` +
   `toggleAdblockDomain(domain)` (persisted — mirror the existing
   store's pattern).
2. Main-process `apps/desktop/src/main/browser/browser-manager.ts`:
   respect the whitelist when applying `@ghostery/adblocker-electron`
   to a webContents — skip the adblocker injection (or temporarily
   disable) for whitelisted hosts.
3. Settings → Przeglądarka (`BrowserSection.tsx`): add a "Blokowanie
   reklam" card with:
   - Master toggle (the current toolbar icon's state).
   - Per-domain whitelist list with add/remove controls.
   - Same for popup-blocker if its behaviour differs.
4. Remove the adblock + popup icons from `BrowserToolbar.tsx`. Update
   `BrowserToolbar.test.tsx` button-index map accordingly.
5. Backward-compat: on first launch after the change, seed the
   whitelist from any per-site state the old toggles exposed (if any).

**Scope note.** Non-trivial — touches main process, renderer store,
settings UI, and removes toolbar surface area. Good fit for its own
dedicated slice, not bundled with other polish.

### K. QA / release

Before cutting a release:

1. `pnpm -w run lint` — should be green (only pre-existing warnings today).
2. `pnpm build` — full web + desktop build. Not attempted during this work.
3. Manual smoke across both Plum (dark) and Paper (light) themes for every
   view.
4. Verify Vitest suite — several component tests may need updates. Phase 3a
   noted `AnimeCard` tests should still pass, Phase 6 updated
   `BrowserToolbar.test.tsx` button-index map. Nothing else ran.
5. Release workflow per the user's policy:
   - PL landing changelog (non-technical)
   - EN GitHub release notes
   - PL Discord announcement
   - Version bump (minor? see below)
6. **Breaking-change review.** The 18→17 theme replacement auto-migrates
   stale IDs to `plum` — no hard error. Everything else is visual-only. So
   the redesign is most honestly a **minor** bump, not major.

---

## 4. File-system map

Quick reference for where everything lives:

```
apps/web/src/
├── components/
│   ├── browser/          — Phase 6 · webview, tabs, newtab (greeting banner)
│   ├── changelog/        — Phase 2c · ChangelogView + ChangelogDialog
│   ├── diary/            — Phase 5 · inline editor, timeline, sidebar
│   ├── discover/         — Phase 4c · 4 tabs + random hero
│   ├── feed/             — Phase 4b · hero + list + reader modal
│   ├── library/          — Phase 3a · cards + detail modal
│   ├── onboarding/       — Phase 2b · 7-step magazine
│   ├── profile/          — Phase 3b · rings + breakdowns (+ ActivityFeed placeholder)
│   ├── schedule/         — Phase 4a · day/week/poster + live-now indicator
│   ├── settings/         — Phase 2a · sidebar nav + cards
│   ├── shared/           — Phase 1 · TitleBar, NavigationDock, ViewHeader, AppBackground, primitives
│   └── ui/               — Phase 0 · shadcn wrappers (restyled) + PillTag
├── lib/
│   ├── theme.ts          — 17-theme registry (Phase 0)
│   ├── changelog-entries.ts — mirrors landing; see H1
│   └── ...
├── stores/               — no redesign changes (only additive where noted above)
└── styles/
    ├── globals.css       — tokens · fonts · scrollbar · keyframes · tiptap
    └── themes/           — 17 OKLCH theme files (1 per theme)

packages/shared/src/types/
├── settings.ts           — BuiltInTheme union (Phase 0)
├── anime.ts              — UserProfile · AiringAnime (needs D1, F1)
└── feed.ts               — FeedItem (needs C1)
```

---

## 5. How to pick up an item in a fresh session

1. Read this doc.
2. Read the referenced mock (`shiroani-design/<View>.html`) top-to-bottom.
3. Read the current view component + its store to confirm the data contract.
4. For items that require main-process IPC, also skim
   `apps/desktop/src/main/` and the preload in
   `apps/desktop/src/main/preload.ts` to match the existing IPC pattern.
5. Typecheck: `pnpm --filter @shiroani/web typecheck` + `pnpm -r typecheck`.
6. **Don't commit** unless explicitly asked. **Don't run `pnpm dev`** — it
   crashes the user's machine (hard policy).
7. No `Co-Authored-By` lines on any commit.
