# Split-Tabs Perf Review — `feat/browser-split-view`

**Date:** 2026-04-27
**Agent:** kirei-perf
**Scope:** Performance impact of the split-view tabs feature on the embedded browser. Static analysis only — no runtime profiling, no app launch.
**Branch:** `feat/browser-split-view` (11 commits on top of master). Tests pass (40/40 in `useBrowserStore.test.ts`); typecheck clean.

---

## TL;DR

One **critical** issue: splitting and unsplitting tabs unmounts every `<webview>` in the affected tabs. The architecture report explicitly required webContents to survive these transitions ("crucial: this is what makes unsplit feel non-destructive"). The implementation does not meet that requirement — splitting two tabs reloads both pages from scratch (loses scroll position, video playback, and navigation history within the webview); unsplitting (or `Ctrl+W` on a focused pane) does the same to the surviving pane.

Everything else on the priority list is either fine, has a small one-shot cost, or is accepted by the architect as known. This branch is **not safe to merge as-is** for a feature whose primary use case is "watch anime on the left, browse Wikipedia on the right" — that flow currently restarts the video on every split/unsplit. Fix #1 is mandatory; #2 and #3 are worth doing before merge; the rest are nice-to-haves.

---

## Critical (must fix before merge)

### C1 — Webview unmount on split / unsplit / closeFocusedPane

**File:** `apps/web/src/components/browser/BrowserView.tsx:353-368` (the `tabs.map(tab => <div key={tab.id}>...)` loop).
**Type:** React reconciliation / webview lifecycle.

**Concern.** The top-level wrapper for each tab is keyed by `tab.id` — and `tab.id` changes when a tab transitions between leaf-level and split-level:

- Before split: `tabs = [{id: A, kind: 'leaf'}, {id: B, kind: 'leaf'}]` → renders `<div key=A>` and `<div key=B>`, each containing one `<BrowserWebview>`.
- After `splitTabs(A, B)`: `tabs = [{id: S, kind: 'split', left: leaf B, right: leaf A}]` → renders a single `<div key=S>` wrapping a `ResizablePanelGroup` with two `<BrowserWebview>` children.

React diffing sees the parent's children change from `[divA, divB]` to `[divS]`, with no shared keys. Both old divs (and every descendant — including the `<webview>` DOM elements) are unmounted; the new `<div key=S>` and a fresh pair of `<webview>` elements are mounted. The new webviews load `src={leaf.url}` from scratch.

The same happens in reverse on `unsplitTab` (`<div key=S>` → `<div key=A>` + `<div key=B>` ⇒ unmount S subtree, mount fresh) and on `closeFocusedPane` when closing one of two panes (the surviving leaf re-emerges at top level under a new outer key).

**Why this matters.** A `<webview>` is an out-of-process Chromium frame. Unmounting it destroys its webContents — the user loses scroll position, video playback frame, in-page navigation history (back/forward stack inside the webview), in-flight network requests, JavaScript timers, and any non-cookie state. For the explicit primary use case ("watch anime on the left while browsing on the right"), splitting restarts the video. Unsplit / close-pane does the same on the surviving page.

The architecture report (`docs/research/2026-04-27-split-tabs-feasibility.md`, §6 Unsplit Button) specifies this behavior must NOT happen: _"webviewRefs entries for both leaves are preserved as-is (their paneIds do not change). Their webContents are not destroyed — they keep their navigation history, scroll position, audio state. Crucial: this is what makes unsplit feel non-destructive."_

**Impact.** Every split / unsplit / pane-close. With 2 webviews per affected tab, that's 2× full Chromium frame teardown + 2× cold reload. On Apple Silicon this is ~200-500ms wall-clock per webview to spin up + reload, plus visible flash. For an anime player this is a hard regression vs. the current single-tab UX.

**Validation that this is real, not paper:** the persistence layer flattens splits to two adjacent leaves on write (so persisted shape stays simple). Store actions only manipulate the tree shape. There is no portal, no stable outer wrapper, no `key={paneId}` lifted out of the split level. The `<BrowserWebview>` is `memo`-wrapped on `paneId`/`initialUrl`/`isActive`, but `memo` doesn't help when React unmounts the parent — the memoization happens in the reconciler's diff, which only kicks in if the element is preserved. With keys changing at the parent level, React never reaches the memo check.

**Fix sketch (any one of these — not for me to implement):**

1. **Stable outer "slot" keys.** Maintain a flat `slots: { id: string, paneIds: string[] }[]` derivation alongside the tree. Render `tabs.map(slot => <div key={slot.stableId}>...)` where `stableId` doesn't change across split/unsplit (e.g., the slot's "first ever leaf id"). Then render the tree inside, but keep the outer wrapper stable. This preserves the parent div across the transition; the webviews inside are still keyed by paneId (which IS stable for a leaf's whole lifetime). React will reconcile: same outer key → same DOM node → memo on `<BrowserWebview paneId=X>` matches → no remount.

2. **Portal pattern.** Render every leaf's `<webview>` once, in a hidden absolute-positioned root container, and use refs to position them based on the tree. Reconciliation never touches them. Most robust, more code.

3. **Outer wrapper keyed by leaf-set hash.** Compute a key from the sorted set of contained leaf ids. Splitting `{A, B}` into one tab still has the same leaf-set, just nested differently. React reconciler walks the inner tree and the leaf wrappers keyed by paneId stay stable. Trickier to get right but a small change.

Option 1 is the cleanest. The data is already in the store (every leaf has a stable id from `crypto.randomUUID()`); just need a derivation layer that gives a stable container id per top-level slot.

**How to verify after fix.** Manual: open Crunchyroll in tab A, start playing an episode at 5:00. Open Wikipedia in tab B. Split them. Verify the video continues playing at the same frame, audio uninterrupted. Unsplit. Verify same. Close one pane. Verify the survivor keeps its state. Add a unit test that mounts `<BrowserView>`, captures the underlying `<webview>` DOM nodes by `paneId`, performs a split, and asserts the same DOM nodes are still present (`Object.is` on the captured refs).

---

## Worth doing (measurable wins before merge)

### W1 — `setSplitRatio` rebuilds every tab on every drag-end

**File:** `apps/web/src/stores/useBrowserStore.ts:399-414`.
**Type:** Wasted work + spurious re-renders.

**Concern.** `setSplitRatio` runs on `onLayoutChanged` (post-pointer-up — confirmed via `react-resizable-panels@4.10.0` `.d.ts` line 110-116). Good — not per-pixel. But the implementation maps over **every** tab and for each one calls `findSplitInTree(tab, splitNodeId)` (full subtree walk) and unconditionally calls `replaceNode(tab, splitNodeId, ...)` (another full walk). For every tab that doesn't contain the split, it builds a `{ ratio: clamped }` literal, then walks the entire tree, then returns the original tab via the `?? tab` fallback. The cast `...(findSplitInTree(...) as BrowserSplitNode)` masks the fact that for non-matching tabs, the spread receives `null` (yields nothing).

Net effect: every drag-end allocates `tabs.length` empty literal objects, walks every tab's tree twice, and produces a fresh `tabs` array reference — which (correctly) triggers a re-render of every `useShallow(tabs)` consumer (just `BrowserView`).

**Impact.** Once per splitter drag-end. Negligible CPU on its own, but the tabs-array reference change re-renders BrowserView, which re-walks every `renderNode` — fine. The wasted work is the per-tab tree walk.

**Fix sketch.** Locate the containing tab once via `findParentSplit(tabs, splitNodeId)` (already in the file), then `tabs[idx] = mapLeavesOrSplits(tabs[idx], splitId, ratio)` and reuse all other tab references. Saves O(total leaves) per drag-end.

### W2 — Per-frame allocation in `splitAwareCollisionDetection`

**File:** `apps/web/src/components/browser/BrowserTabBar.tsx:41-52`.
**Type:** Per-frame work during drag.

**Concern.** Called on every pointer move (~60Hz while dragging). It calls `pointerWithin(args)` (walks all droppables, allocates an array), filters that array by string-prefix match (allocates a second array), and if empty, builds a new args object via spread + `droppableContainers.filter(...)` (third allocation), then calls `closestCenter` on the filtered list (walks again, allocates a fourth array). Total per frame: 4 array allocations + ~2N container iterations + N string startsWith checks per call.

With ≤20 tabs (typical realistic upper bound), this is ~40 iterations per frame. Negligible. With 100+ tabs (power user), it becomes ~200 iterations per frame, still under 1ms.

**Impact.** Zero pain at typical tab counts. Worth flagging because it allocates on every pointer move during drag (GC pressure if user is on a low-tier device with many tabs).

**Fix sketch.** Cache the filter result. Either (a) precompute the merge-vs-sortable partition once per drag start using `useDndContext` or a ref, (b) replace `String(c.id).startsWith(MERGE_PREFIX)` with a `Set<string>` lookup populated from the IDs, or (c) skip the early `pointerWithin` filter entirely and let `closestCenter` rank both kinds, then post-process. Lowest-effort win is (b).

### W3 — Discord RPC ping-pong on split-tab focus switching

**File:** `apps/web/src/lib/anime-detection.ts:120-159` (`updateAnimePresence`); called from `apps/web/src/stores/useBrowserStore.ts:264, 421` and from every `did-navigate` / `page-title-updated` in `apps/web/src/hooks/useWebviewEvents.ts:78, 89, 95`.
**Type:** External rate-limit / IPC chatter.

**Concern.** Architect flagged this as Risk #5 in the feasibility doc and explicitly left it out of scope. With splits, every focus flip from pane A → pane B fires `updateAnimePresence(B)` immediately, calling out via IPC to the main process which calls `discord-rpc`. Quick clicks back and forth (200ms apart) → 4-5 RPC writes per second.

Discord's client-side rate limit on RPC presence updates is typically 5/20s; exceeding it silently drops updates. So the user-perceived bug is "I'm watching anime in pane A, click pane B for 1 second, click back to A — Discord still says I'm browsing pane B's site for 19 seconds." Reverse direction also: focus jitter near a split-pane boundary on a trackpad can rapid-fire updates.

**Impact.** Cosmetic — Discord will sometimes show the wrong activity briefly. Not a perf hit on the app itself; the function is cheap. Worth fixing because it's a one-line change with user-visible benefit.

**Fix sketch.** Trailing debounce in `anime-detection.ts`:

```ts
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingArgs: [string, ...] | null = null;

export function updateAnimePresence(paneId: string, ...rest) {
  pendingArgs = [paneId, ...rest];
  if (pendingTimer) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const [id, ...r] = pendingArgs!;
    pendingArgs = null;
    doUpdatePresence(id, ...r);
  }, 250);
}
```

250ms is enough to absorb fast click-throughs, short enough to feel instant on deliberate switches. Architect suggested 500ms; either is fine.

---

## Acceptable (known concerns documented in the feasibility doc, OK as-is)

### A1 — Two webviews per split tab is two Chromium frames

**Source:** Feasibility report §"Memory" / risk discussion is implicit.

The feature inherently doubles the webview count for a split tab. A user with 5 tabs, 2 of them split, runs 7 webviews (5 + 2 extra). Each webview is a separate Chromium renderer process (~150-300MB depending on page). This is fundamental to the design, not a regression. The user explicitly accepts this trade in exchange for split UX. Verified: webviews are properly destroyed when their leaf is removed from the tree (`unregisterWebview` on `closeFocusedPane`/`closeTab`; `useWebviewEvents` cleanup removes listeners on unmount). **No leak.**

### A2 — `restoreTabs` flattens splits to adjacent leaves on disk

**File:** `apps/web/src/stores/useBrowserStore.ts:567-609` (persist), `:611-699` (restore).

`persistTabs` walks `collectLeaves` for every tab on every write (debounced 1000ms after a leaf change). For N total leaves, O(N) per write. `migratePersistedTabs` is also O(N) on restore — single pass, validates, drops malformed entries. No O(N²) path. After restoring, every leaf gets a fresh UUID (intentional — the restored leaf has no live webContents to bind to). **Fine** — splits don't survive restart, which the architect explicitly chose ("session state intentionally not preserved", per feasibility doc Risk #3). No perf concern.

### A3 — `BrowserView` re-renders on any leaf change

The `useShallow(s => s.tabs)` selector causes `BrowserView` to re-render whenever any tab in the array changes reference (e.g., a `did-navigate` updates one leaf's URL → `mapLeaves` produces a new tab object → array reference changes → re-render). The recursive `renderNode` call walks the whole tree on each re-render. Within the tree, `<BrowserWebview>` is `memo`-wrapped on `(paneId, initialUrl, isActive)` so the actual `<webview>` element doesn't get reset unless `initialUrl` changes. This was also true on master (same `useShallow(tabs)` pattern). **Pre-existing**, not a regression. Fine.

### A4 — Bundle size delta from `react-resizable-panels`

`apps/web/node_modules/react-resizable-panels@4.10.0` is **54KB raw ESM, ~14KB gzipped** (measured: `gzip -c react-resizable-panels.js | wc -c` → 14402). Production builds tree-shake unused exports. The branch only uses `Group`, `Panel`, `Separator`. Net add ≈ 12-14KB gzipped on the renderer bundle, which already ships several MB of React + shadcn + lucide. Negligible relative impact, and necessary for the feature. **Fine.**

### A5 — DnD `useDroppable` registers an inner merge zone per tab

Every `SortableTab` registers an additional `useDroppable` (the merge zone). For N tabs that's 2N droppables in the DnD context. `@dnd-kit` keeps these in a Map keyed by id; the runtime cost per pointer move is O(2N) iteration in collision detection (covered in W2). At realistic tab counts (≤20) this is fine. The merge zone is `disabled` when the tab is being dragged or when `splitTabsEnabled === false`, which is good — disabled droppables are excluded from collision tests internally. ✓

### A6 — `PaneChrome` not memoized; per-pane click handlers are inline closures

`PaneChrome` (`BrowserView.tsx:57-87`) re-renders on every `BrowserView` re-render. Inside, `onClick={e => { e.stopPropagation(); unsplitTab(parentSplitId); }}` is a fresh closure each render, defeating any `memo` on `TooltipButton`. Same for the `onMouseDownCapture={() => onPaneClick(node.id)}` on the leaf wrapper. With ≤2 panes per split, this is ~4 closure allocations per `BrowserView` render. The cost of re-running TooltipButton's render is ~tens of microseconds — negligible. **Fine.** Could be made memo-friendly later if profiling ever shows it on the flame graph.

### A7 — `migratePersistedTabs` startup cost

Single pass, O(persisted-tab-count). For a user with 50 saved tabs that's 50 type-checks + 50 object allocations on cold start. Sub-millisecond. **Fine.** No O(N²) path.

### A8 — Splitter handle uses `backdrop-blur-sm`

`apps/web/src/components/ui/resizable.tsx:34` puts `backdrop-blur-sm` on the small grip element. This is the user's flagged-feedback term, but the grip is a single 5×3px element per active split (not in a scrollable repeating list), so the GPU layer cost is bounded and unrelated to the prior "image-heavy scroll" concern. **Fine.**

---

## No-op (verified clean)

- **`useWebviewEvents` event listener cleanup.** Captures `el = webviewRef.current` at effect-start; cleanup removes every listener it added on the captured ref. Deps `[paneId]` are stable. `unregisterWebview(paneId)` runs on unmount. **No listener leak.**
- **`focusPane` does not double-fire RPC at split creation.** `splitTabs` sets `activePaneId` directly via `set(...)` without calling `updateAnimePresence`; the only `updateAnimePresence` callsite during a split is the next user click → `focusPane(paneId)`. **No spurious RPC at split time.**
- **`pointer-events: auto` overlay during splitter drag.** Toggled via `isResizing` state which flips on `pointerDownCapture` / `pointerUp` / `pointerCancel`. Overlay div is `absolute inset-0 z-20` inside each leaf's content wrapper — covers the webview but NOT the splitter handle (handle is sibling to panels). Pointer events get caught and eaten on the leaf side; the handle still receives drag events. ✓ Implementation matches feasibility-doc Risk #2 mitigation.
- **`setSplitRatio` clamps to [0.2, 0.8].** Matches the architect's recommendation in §5 ("min size per panel: 20%").
- **Split-tab persistence shape.** Flattens to adjacent leaves on write (`useBrowserStore.ts:579-606`). Schema unchanged from master ({ url, title } per tab + activeIndex). Forward-compat with old reads. ✓
- **`splitTabsEnabled` setting gating.** When false, merge-zone droppables are `disabled`; `splitTabs` action is not even passed to `BrowserTabBar` (`BrowserView.tsx:314: onSplitTabs={splitTabsEnabled ? splitTabs : undefined}`). Disabling the toggle also flattens any open splits via `setSplitTabsEnabled` (`useBrowserStore.ts:531-550`). Behavior matches the architect's recommendation. ✓ (One small note: this same teardown path triggers C1 — every open split unsplits, every webview rebuilds. After C1 is fixed, this is fine.)
- **`onLayoutChanged` (not `onLayoutChange`) is wired up.** Confirmed in `react-resizable-panels` v4.10.0 `.d.ts` lines 110-116: `onLayoutChanged` fires after pointer release; `onLayoutChange` fires every pointer move. The branch correctly uses `onLayoutChanged`. ✓
- **Tests.** 40/40 pass in `apps/web/src/stores/__tests__/useBrowserStore.test.ts`. Type-check clean for the web app.

---

## Quick Wins (< 1 hour each)

| Fix                                                               | Where                                                     | Expected gain                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Debounce `updateAnimePresence` (W3)                               | `apps/web/src/lib/anime-detection.ts`                     | Eliminate Discord RPC ping-pong on fast pane switches                    |
| Short-circuit `setSplitRatio` (W1)                                | `apps/web/src/stores/useBrowserStore.ts:399-414`          | One drag-end-per-second saves O(total leaves) work + N empty allocations |
| Cache merge-zone partition in `splitAwareCollisionDetection` (W2) | `apps/web/src/components/browser/BrowserTabBar.tsx:41-52` | Trim ~2× per-frame iteration during drag                                 |

## Heavy Lift (> 1 day)

| Fix                                    | Why it's big                                                                                                                                                     | Expected gain                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Stable outer "slot" keys for tabs (C1) | Touches `BrowserView` render structure + needs a derivation that's stable across split/unsplit; needs a DOM-level test that webview elements survive transitions | Preserves video playback, scroll, in-webview history across split/unsplit/close-pane. Required by feature spec. |

## Metrics to Track Before/After C1

- **Webview reload count on split.** Open Crunchyroll in tab A and Wikipedia in tab B (both visible loading state, video playing). Drag A onto B. Count `did-stop-loading` events fired during the next 2 seconds. Before fix: 2 (both webviews reload). After fix: 0.
- **Scroll position preservation.** Scroll Wikipedia to anchor X. Split. Inspect `scrollY` in the surviving leaf's webContents. Before fix: 0. After fix: X.
- **Process count.** `ps aux | grep -c '[E]lectron Helper.*type=renderer'` before vs. after a split-then-unsplit cycle. Before fix: count goes up 2, down 2 (2 process churns). After fix: count unchanged.

---

## Go / No-go

**No-go for merge as-is.** The C1 webview-unmount issue defeats the feature's primary use case (persistent side-by-side viewing). Every other finding is fine, accepted, or worth-doing-soon, but C1 is fundamental to the value proposition the architect specced out — splits aren't "safe to use during a video" if they restart the video. Land the slot-key fix (or portal equivalent) plus a webview-survival test, ship the W1-W3 quick wins if cheap, and re-review. The `splitTabsEnabled` toggle defaults to `true` per the architect's recommendation; keep it true after C1 is fixed, but consider flipping to false on the first user-facing release until C1 is verified on macOS Apple Silicon.
