# Research: "Time spent in ShiroAni" tracking feature

**Date:** 2026-04-26
**Agent:** kirei
**Status:** complete

## Problem

Add a playful "how long have you spent in ShiroAni" tracking feature to the
desktop app, in the spirit of Spotify Wrapped or Discord's "active for X hours"
stat. Three open questions from the user:

1. What exactly to track (granularity, what counts as "active")
2. Where to surface it in the UI
3. What fun anime-themed conversions feel native

The deliverable is an opinionated, concrete proposal — not a menu.

---

## Codebase findings (signals already present)

### What does NOT exist yet

- **No app-time tracking of any kind.** Grep for `watchTime`, `powerMonitor`,
  `getSystemIdleTime`, `episodeWatched` returns nothing in `apps/desktop/` or
  `apps/web/`. Greenfield feature.
- **No persistent "watch time" per-anime.** The Discord RPC service has
  `activityStartTime` (line 32 of `discord-rpc-service.ts`) but it is in-memory
  only and represents the current Discord presence session — not persisted.
- The "minutes watched" counter on the Profile view
  (`apps/web/src/components/profile/ProfileDashboard.tsx:91`) comes from the
  user's AniList account, not from local activity. It says
  "Obejrzałeś łącznie X odcinków, to ok. Y dni przed ekranem" — so the _vocabulary_
  of "X dni przed ekranem" is already established in the UI. We should reuse it.

### What signals are wired and reusable

- **Window focus / blur** —
  `apps/desktop/src/main/index.ts:232-233` already attaches
  `win.on('blur', ...)` and `win.on('focus', ...)` for Discord RPC idle
  detection. We can plumb a tracker into the same hooks at zero new cost.
- **Window visibility events** — `minimize`, `restore`, `show`, `hide`,
  `enter-full-screen`, `leave-full-screen` are all wired on lines 224–229 for
  the mascot. Free signal for "is the window even on screen?"
- **App lifecycle** — `app.on('before-quit')` on line 469 runs a `safeCleanup`
  pipeline. This is the right place to flush a final session record.
- **Discord RPC idle timer** — `discord-rpc-service.ts:35` defines
  `IDLE_TIMEOUT_MS = 20_000` and the `onWindowBlur` handler. The 20-second idle
  threshold is already shipped behavior; aligning ours with it means one mental
  model for the user.
- **Anime detection in browser** — `apps/web/src/lib/anime-detection.ts` already
  detects ogladajanime.pl, shinden.pl, youtube.com URLs and updates Discord
  presence. The renderer fires `discord-rpc:update-presence` whenever a tab
  navigates. We can add a parallel `app-stats:set-watching-anime` channel
  driven from the same site.
- **electron-store** — single shared instance at `apps/desktop/src/main/store.ts`.
  Whitelisted keys live in `apps/desktop/src/main/ipc/store.ts:13-62` (we'll add
  one new key). User just downgraded electron-store v11 → v8 (commit 7f4e991),
  so stay on v8 idioms (`store.get(key)` returns `unknown`, no schema needed).
- **`powerMonitor`** — Electron's `powerMonitor.getSystemIdleTime()` returns
  OS-level idle seconds, and emits `suspend` / `resume` / `lock-screen` /
  `unlock-screen`. Currently UNUSED in the codebase. This is the single most
  important addition — it lets us cut sessions cleanly when the laptop is
  closed/locked.

### Key architectural facts to honor

- All IPC writes go through whitelisted keys (`isWriteKeyAllowed` exact match).
  We must add the new store key to `ALLOWED_STORE_KEYS`.
- Preload IPC channels are explicitly whitelisted in
  `apps/desktop/src/main/preload/_shared.ts:8-83`. Any new IPC channel must be
  added there too.
- ElectronAPI shape is the single source of truth in
  `packages/shared/src/types/electron-api.ts`. Renderer code reads
  `window.electronAPI?.<domain>?.<method>`.
- Tests follow the pattern in `apps/desktop/src/main/ipc/__tests__/` with
  `__invoke` mocks. New tracker should ship with tests.
- Polish copy throughout. The strings `formatDays(minutes)` /
  `formatDaysLabel(minutes)` already exist at
  `apps/web/src/components/profile/profile-constants.ts:3-10` — reuse them.
- `pluralize(count, one, few, many)` exists in
  `packages/shared/src/formatters.ts:13` — must use it for any "X dni / godzin /
  minut" copy.

---

## Recommended approach (opinionated)

### What to track — three counters, one model

Track three correlated but distinct numbers, all in seconds:

1. **`appOpenSeconds`** — wall-clock time the main window has been open
   (regardless of focus). Counts even when minimized to tray. The "soft" number.
2. **`appActiveSeconds`** — seconds the user was actively interacting
   (window focused AND `getSystemIdleState(60) === 'active'`). The "real" number.
3. **`animeWatchSeconds`** — subset of `appActiveSeconds` where the active
   browser tab matched the existing anime-detection rules. The "fun" number we
   surface most prominently.

Why three: separating them lets us say things like
_"Spędziłeś z ShiroAni 24h, z czego 18h aktywnie i 9h oglądając anime."_
That is the Spotify-Wrapped flavor. One number is boring; three tell a story.

### Granularity — daily buckets + a totals object

```jsonc
// electron-store key: "app-stats"
{
  "version": 1, // bump for migrations
  "createdAt": "2026-04-26T20:00:00.000Z", // first-ever session
  "totals": {
    "appOpenSeconds": 312540,
    "appActiveSeconds": 198320,
    "animeWatchSeconds": 91200,
    "sessionCount": 184,
  },
  "byDay": {
    // ISO date in user's local timezone, NOT UTC — wrapped-style
    // recap reads as "your day" not "your UTC day"
    "2026-04-26": {
      "appOpenSeconds": 4320,
      "appActiveSeconds": 3100,
      "animeWatchSeconds": 1800,
      "longestSessionSeconds": 2400,
    },
  },
  "currentStreak": { "days": 7, "lastDay": "2026-04-26" },
  "longestStreak": { "days": 12, "endedOn": "2026-03-15" },
}
```

**Daily, not per-session.** Per-session would explode the store and we would
never need it. Daily lets us draw a streak/heatmap later if wanted. We retain
only ~365 days; older entries get rolled into `totals` and deleted (the user
just fought a v11→v8 downgrade — small files only).

**One in-memory tracker, three counters.** The main process keeps a single
`AppStatsTracker` with these mutable fields and a 60-second flush loop that
writes the current day's bucket to electron-store. 60s is rare enough to be
cheap, frequent enough that a crash loses ≤1 minute.

### Idle handling — multi-signal, conservative

A "tick" (seconds added to `appActiveSeconds`) runs every 10 seconds and adds
10s **only if all of these are true:**

- Main window is `focused()` (not blurred)
- Main window is `isVisible()` and not minimized
- `powerMonitor.getSystemIdleState(60)` returns `'active'` (not `idle` or
  `locked`) — using the 60-second OS idle threshold matches the system "are
  you away" heuristic and is more reliable than `getSystemIdleTime()` math
- The tracker is not in a "suspended" state (see below)

For `appOpenSeconds`: any tick where the main window exists adds 10s — even if
blurred or minimized. This is the "the app is technically open" number.

For `animeWatchSeconds`: same gate as `appActiveSeconds`, plus a renderer-driven
boolean `isWatchingAnime` (true when the active tab's anime-detection returns a
hit AND `activeView === 'browser'`). The renderer sends an
`app-stats:set-watching-anime` IPC whenever this flips. Cheap.

### Power events — hard cuts

- `powerMonitor.on('suspend')` → flush current day, set `isPaused=true`.
  Stop ticks.
- `powerMonitor.on('resume')` → set `isPaused=false`. **Do not** retroactively
  count the gap. Resumes get a fresh tick cycle.
- `powerMonitor.on('lock-screen')` → same as suspend (gate ticks off).
- `powerMonitor.on('unlock-screen')` → same as resume.

This is the abuse fix for "I left my laptop closed for 3 days, am I really
3-day Frieren-marathon active?" — answer: no, because the OS told us we were
locked.

### Clock-skew defense

Each tick uses `process.hrtime.bigint()` for the _delta_ (monotonic, immune to
NTP corrections / DST). `Date.now()` is used only to label the day bucket.
Reject deltas > 30s (signals a process that was suspended without firing
`suspend` — happens on Linux laptops and Windows fast-startup).

### Persistence shape — single key, debounced writes

- Store key: `app-stats` (add to `ALLOWED_STORE_KEYS` and to the preload
  whitelist as `app-stats:*` channels).
- Write strategy: debounced flush every 60s + flush on `suspend`,
  `lock-screen`, `before-quit`, `window.on('hide')`. JSON.stringify size for a
  365-day store is ~120KB — well under the 1MB store guard.

### Crash recovery

If the app crashes mid-session, the worst case is ≤60s of unflushed activity
lost. Acceptable. We do not keep a "current session" record on disk because
the day bucket already aggregates everything we care about.

---

## UI surfaces — three placement options ranked

### Option A (RECOMMENDED) — new "Statystyki" tab in Profile view

Add a tabbed switcher inside `ProfileView.tsx` (currently single-pane):
**AniList** (current dashboard) | **W aplikacji** (new local stats).

- **Pro:** Profile view is _already_ a stats surface with the right vocabulary
  ("X dni przed ekranem", `formatDays`, `formatDaysLabel`). The two stat sets
  contrast meaningfully — AniList = "what I've watched ever", local = "what I've
  done in ShiroAni". No new dock item, no menu sprawl.
- **Pro:** When the user has no AniList connected (`ProfileSetup` state), the
  in-app stats tab still works — gives the Profile view a reason to exist
  pre-onboarding.
- **Con:** Locked behind clicking Profile. Less discoverable than a dock item.
- **Con:** Ties two unrelated data sources (remote AniList + local) into one
  view; need clear visual separation.

### Option B — strip on the Library view header

Add a small inline strip at the top of `LibraryView.tsx` showing
"Z ShiroAni od 84 dni · obejrzałeś tu Frieren × 3".

- **Pro:** Highest discoverability — Library is the most-visited view.
- **Con:** Library is already dense and the user explicitly noted "avoid
  backdrop-blur/will-change/hover-scale on repeated elements in image-heavy
  scrollable views" — adding a stat strip pushes the grid down.
- **Con:** No room for the multi-number breakdown that makes the feature
  interesting.

### Option C — dedicated "Statystyki" dock item

Add `'stats'` to `ALL_NAV_ITEMS` in `apps/web/src/lib/nav-items.ts`, ship a
`StatsView.tsx`.

- **Pro:** Cleanest mental model — stats are first-class.
- **Con:** Adds a 10th dock item (current count is 9). The dock geometry
  (`NavigationDock.tsx`) auto-resizes but at ~10 items the labels start
  truncating. Real estate cost is real.
- **Con:** Stats view will feel sparse when the only data is "you've been here
  3 hours". Profile-tab placement amortizes that thinness against AniList data.

### Recommendation

**Ship Option A.** Profile is the right home; it already speaks "stats". If
the feature lands well later, graduating it to Option C is a small refactor
(extract `<InAppStats />` component, point a new view at it, add to nav-items).

A sub-pattern from Option B can also live in Option A: show a small
"Aktywny od X dni" badge in the existing **`ProfileSidebar`** (next to the
AniList username) so there is _some_ glanceable surface even before the user
opens the new tab.

---

## Polish copy proposals (anime-flavored conversions)

Numbers are illustrative; the implementer will compute them. The goal is one
"hero" line + 2–3 detail lines.

### Hero variants — pick one of these per session, deterministic-by-day

```
W ShiroAni jesteś już 84 dni · 12h aktywnie · 4 dni z anime
```

```
Spędziłeś tu 4 dni i 7 godzin — to cały sezon Frieren z marginesem na opening
```

```
Twój czas z ShiroAni: 312h aktywnie. To 624 odcinki SPY×FAMILY albo dwa razy
Tatami Galaxy.
```

```
84 sesje, 312 godzin, najdłuższa: 4h 22min — solidny maraton
```

### Anime-equivalence conversions (constants)

Use a small lookup table — I propose a few "yardsticks", picked deterministically
from the day-of-year to keep the copy fresh without RNG flicker:

```ts
// apps/web/src/lib/stats-conversions.ts
export const YARDSTICKS = [
  { id: 'frieren', title: 'Frieren', episodes: 28, perEpisodeMin: 24 },
  { id: 'spyfamily', title: 'SPY×FAMILY', episodes: 25, perEpisodeMin: 24 },
  { id: 'cowboybop', title: 'Cowboy Bebop', episodes: 26, perEpisodeMin: 24 },
  { id: 'monogatari', title: 'Bakemonogatari', episodes: 15, perEpisodeMin: 24 },
  { id: 'evangelion', title: 'Neon Genesis Evangelion', episodes: 26, perEpisodeMin: 24 },
];
```

Then:

- "to równowartość 14 odcinków SPY×FAMILY"
- "obejrzałbyś Frieren w całości jeszcze raz, z zapasem"
- "wystarczyłoby na cały Cowboy Bebop"

The user said opinionated — my pick: **lead with Frieren** (most resonant in
the 2024–2026 anime canon, fits the Spy×Family-noir landing aesthetic by
contrast) and rotate through the others as detail lines.

### Streak copy

```
Otwierasz ShiroAni 7 dni z rzędu — najdłuższa seria: 12 dni.
```

Use `pluralize(streak, 'dzień', 'dni', 'dni')` from
`packages/shared/src/formatters.ts`.

### Empty / first-day copy

```
Twoja podróż dopiero się zaczyna · 2 godziny w ShiroAni
```

---

## Files to modify

### New files

- `apps/desktop/src/main/stats/app-stats-tracker.ts` — main-process tracker
  service. Singleton class with `start()`, `stop()`, `recordTick()`,
  `setWatchingAnime(boolean)`, `getSnapshot()`, `flush()`. Owns the
  `setInterval(..., 10_000)` tick loop.
- `apps/desktop/src/main/stats/conversions.ts` — yardstick lookup, day-of-year
  picker (kept main-side too so the tracker can build "today's hero line" once,
  for use in IPC payloads if we ever want it).
- `apps/desktop/src/main/ipc/app-stats.ts` — IPC handlers
  (`app-stats:get-snapshot`, `app-stats:set-watching-anime`, `app-stats:reset`).
- `apps/desktop/src/main/preload/app-stats.ts` — `appStats` preload bridge.
- `apps/desktop/src/main/__tests__/app-stats-tracker.test.ts` — unit tests
  (idle gating, suspend/resume cuts, day rollover, totals).
- `apps/web/src/stores/useAppStatsStore.ts` — Zustand store mirroring the
  snapshot, with `refresh()` and a 60s polling interval.
- `apps/web/src/lib/stats-conversions.ts` — renderer-side copy generators
  (`buildHeroLine(snapshot)`, `formatYardstick(seconds, yardstickId)`).
- `apps/web/src/components/profile/InAppStatsPanel.tsx` — the new panel rendered
  inside Profile's "W aplikacji" tab.

### Modify

- `apps/desktop/src/main/index.ts` — instantiate `appStatsTracker` in
  `bootstrap()`, wire `win.on('focus'|'blur'|'minimize'|'restore')` calls,
  attach `powerMonitor` listeners, register the new IPC, add a flush in the
  `before-quit` `safeCleanup` chain.
- `apps/desktop/src/main/ipc/store.ts` — add `'app-stats'` to
  `ALLOWED_STORE_KEYS` (line 13).
- `apps/desktop/src/main/preload/_shared.ts` — add `'app-stats:get-snapshot'`,
  `'app-stats:set-watching-anime'`, `'app-stats:reset'` to
  `ALLOWED_IPC_CHANNELS`.
- `apps/desktop/src/main/preload/index.ts` — re-export `appStats` preload.
- `apps/desktop/src/main/ipc/register.ts` — register/cleanup the new handlers.
- `packages/shared/src/types/electron-api.ts` — extend `ElectronAPI` with
  `appStats: { getSnapshot, setWatchingAnime, reset, onSnapshotChange }`.
- `packages/shared/src/types/anime.ts` (or new `stats.ts`) — export
  `AppStatsSnapshot` interface used by both processes.
- `apps/web/src/lib/anime-detection.ts` — at the bottom of
  `updateAnimePresence`, also call
  `window.electronAPI?.appStats?.setWatchingAnime(detection !== null)`.
- `apps/web/src/stores/useAppStore.ts` — when `navigateTo` lands on a non-browser
  view, call `setWatchingAnime(false)`. (Mirrors the existing Discord-presence
  wiring already at lines 42–57.)
- `apps/web/src/components/profile/ProfileView.tsx` — add a tabbed header
  switching between `AniList` and `W aplikacji`. Keep `ProfileDashboard` as-is
  for the AniList tab; render `<InAppStatsPanel />` for the new tab.
- `apps/web/src/components/profile/ProfileSidebar.tsx` — add the small
  "Aktywny od X dni · X godzin tutaj" badge under the avatar block.

### Reference files (do not modify, but match patterns)

- `apps/desktop/src/main/discord/discord-rpc-service.ts` — singleton service
  with init/cleanup pattern, settings persistence, idle timer. Good template.
- `apps/desktop/src/main/ipc/discord-rpc.ts` — IPC handler shape with Zod
  schemas via `with-ipc-handler`.
- `apps/web/src/components/profile/ProfileStatGrid.tsx` — `StatCard` component
  with the right typography and OKLCH accent colors. Reuse it.
- `apps/web/src/components/profile/profile-constants.ts` — `formatDays`,
  `formatDaysLabel` formatters.

---

## Risks & gotchas

1. **macOS hide-vs-quit asymmetry.** `index.ts:209-214` makes the red
   traffic-light _hide_ the window on macOS instead of destroying it. The
   tracker must NOT count `appOpenSeconds` while hidden — `win.isVisible()`
   returns false in that state, so the gate works, but verify in the test
   suite.
2. **Multi-window.** No multi-window support today (`mainWindow` is a single
   global), so we do not need to multiplex. If multi-window ever lands, the
   tracker must aggregate `isFocused()` across all
   `BrowserWindow.getAllWindows()`. Add a comment to flag this.
3. **Mascot overlay window.** `apps/desktop/src/main/mascot/overlay.ts` creates
   a second `BrowserWindow`. It must be excluded from focus checks — gate the
   tracker on `mainWindow.isFocused()` specifically, not "any window focused".
4. **Suspend without `suspend` event.** On some Linux distros and on Windows
   "fast startup", `powerMonitor.on('suspend')` is unreliable. The hrtime delta
   ceiling (reject ticks > 30s) is the backstop. Tested by mocking
   `process.hrtime.bigint()` in the unit tests.
5. **DST / timezone for day buckets.** Use the user's _local_ date string
   (`new Date().toLocaleDateString('sv-SE')` gives `YYYY-MM-DD` cheaply), not
   UTC. On the spring-forward day a bucket will be 23h long, which is fine —
   we never sum `byDay` to derive `totals`.
6. **Privacy.** All data is local. The tracker NEVER calls `fetch()` or sends
   anything off-device. Document this in `AboutSection.tsx` if the user asks.
   No telemetry hook; no opt-out needed because there is no out-flow.
7. **Reset / privacy sub-feature.** Add a "Wyczyść statystyki" button in the
   Profile in-app stats panel that calls `app-stats:reset`. Required by user
   trust norms; cheap to ship.
8. **Onboarding interaction.** The tracker should NOT start until the splash
   screen dismisses (renderer fires `app-stats:start` after
   `useAppInitialization` reports `ready`) — otherwise the first-run onboarding
   wizard inflates the day-1 bucket with bookkeeping time. Or simpler: discard
   the first 60s of any new install (`createdAt` is null until then).
9. **AniList "minutesWatched" already exists in Profile.** Be explicit in the
   UI that the new stats are _local app activity_, not a duplicate.
   Header copy: **"W aplikacji"** vs **"Z AniList"**. Two tabs, two stories.
10. **Conversion overflow.** "X% Frieren" stops being fun at 200+. Cap the
    yardstick line: switch from "X odcinków" to "Y razy cały Frieren" once
    `seconds > yardstick.totalSeconds * 1.2`.
11. **electron-store v8 typing.** `store.get('app-stats')` returns `unknown`.
    Validate with a Zod parser at boundary (matches existing pattern in
    `discord-rpc-service.ts:37-58` which manually narrows). Reset to defaults
    if parse fails — never throw.

---

## Scope assessment

**FORGE.** Confirms the user's read.

Scope footprint:

- New main-process service + tick loop + power-monitor integration.
- New IPC contract (3 channels) with preload + whitelist + Zod schemas.
- New shared types in `@shiroani/shared`.
- New electron-store key + ALLOWED_STORE_KEYS update.
- New renderer Zustand store + polling.
- Modified anime-detection wiring (1-line addition, but cross-file).
- New UI panel + tabbed Profile view.
- Tests in 2 places (main tracker, IPC layer).

That is ~10 new files, ~7 modified files, two processes, and a public IPC
contract. Single-feature scope but architectural surface — `kirei-forge` is
the right tool.

---

## How to verify

### Manual

1. Launch app, leave it running 5 minutes with the window focused. Open
   Profile → "W aplikacji" tab. Expect `appActiveSeconds ≈ 300`.
2. Blur the window for 90 seconds. Expect `appActiveSeconds` to stop
   incrementing but `appOpenSeconds` to keep going.
3. Lock the screen for 2 minutes (Cmd+Ctrl+Q on macOS, Win+L on Windows).
   Unlock. Expect both counters to skip the locked gap.
4. Close laptop lid for 5+ minutes (suspend). Reopen. Expect the gap NOT to
   appear in any counter.
5. Navigate to ogladajanime.pl in the built-in browser, watch for 1 minute.
   Expect `animeWatchSeconds += ~60`. Navigate to google.com. Expect
   `animeWatchSeconds` to stop incrementing.
6. Quit the app. Reopen. Expect totals to persist.
7. Click "Wyczyść statystyki". Expect totals to reset to 0; `byDay` empty.

### Automated

- Tracker unit tests with mocked `powerMonitor`, `BrowserWindow`,
  `process.hrtime.bigint`. Cover: tick gating, suspend cuts, day rollover at
  midnight, hrtime delta ceiling, isWatchingAnime state machine.
- IPC test (mirrors `apps/desktop/src/main/ipc/__tests__/discord-rpc.test.ts`).
- Snapshot Zod parser test for malformed store payloads.

---

## Open questions

1. **First-day grace period:** discard the first 60s after a fresh install
   (covers onboarding bookkeeping), or always count from t=0? My recommendation:
   discard. Ask user.
2. **Yardstick title list:** are Frieren / SPY×FAMILY / Cowboy Bebop /
   Bakemonogatari / Evangelion the right canon for _this_ user? Easy to swap.
3. **Streak feature in v1?** Trivial to compute given the daily buckets but
   adds copy + UI. My recommendation: include the badge ("7 dni z rzędu") but
   defer a heatmap visualization to a v2.
4. **"Wrapped"-style year-end recap?** Out of scope for v1. Daily buckets make
   it feasible later — flag in code as `// FUTURE: yearly recap reads byDay`.
5. **Mobile parity (the user is exploring React Native).** The tracker is
   Electron-process-bound; on mobile we'd reimplement against `AppState`. Not
   a blocker; flag as a future port.
