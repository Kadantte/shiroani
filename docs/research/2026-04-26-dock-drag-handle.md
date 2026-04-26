# Dock Drag Handle — UI/UX Research

**Date:** 2026-04-26
**Agent:** kirei-ui
**Stack:** React + TypeScript + Tailwind + lucide-react + Zustand
**Scope:** Replace whole-dock drag activation with a dedicated drag handle.

## 1. Audit of current drag UX

### What works

- The 5px `DRAG_THRESHOLD` in `apps/web/src/hooks/useDockDrag.ts:4` is the only thing keeping clicks from being eaten — and it does function. Pointer capture is correctly deferred until threshold is exceeded (`useDockDrag.ts:42-44`), which is good defensive design.
- `hasDraggedRef` is plumbed through to `DockItem.onClick` (`NavigationDock.tsx:541`) so a real drag does not produce a stray navigation. Click-suppression is solid.
- `snapToEdge` in `useDockStore.ts:161-189` handles all 4 edges and clamps offset to 5–95% — robust.
- Drag cursor state (`cursor-grab active:cursor-grabbing`) is applied to both collapsed and full mode (`NavigationDock.tsx:461,500`).

### What's annoying / problems

1. **Whole-surface grab is the core problem.** `onPointerDown` is on the entire pill container (`NavigationDock.tsx:486-488` for full mode and `:450-452` for collapsed). Every press on any icon button is eligible to become a drag. The 5px threshold makes accidental drags rare but not zero — a slow press-and-release where the cursor drifts >5px (common with touchpad / shaky hand) still triggers a drag and swallows the click via `hasDraggedRef`. On touch devices the threshold is even more fragile.
2. **No affordance for what is draggable.** `cursor-grab` is shown on hover of the entire pill. Users see "you can grab here" on every icon, contradicting the click intent of the icons. The visual signal lies about the interaction model.
3. **`select-none` + `touch-none` on the pill** (`NavigationDock.tsx:507`) are global mitigations because the whole surface is a drag zone.
4. **`active:cursor-grabbing` fires on icon clicks** because pressing an icon also presses the container. Visually distracting.
5. **Collapsed-logo mode is worse.** The single 40×40 logo-only pill is _both_ the click target (to re-expand the nav) and the drag handle. Pressing-and-holding the logo with any drift initiates a drag of what the user sees as a navigation tap.
6. **No keyboard alternative.** There is no way to reposition the dock from the keyboard.
7. **Polish gap:** during drag, the pill goes `opacity-80 scale-95` (`NavigationDock.tsx:502`) but there is no visual change on the handle itself, because there is no handle.

### Edge cases to preserve

- `draggable=false` from settings → no drag possible.
- Auto-hide mode → collapsed-logo press should re-expand.
- All 4 edges + showLabels on/off + autoHide collapsed/expanded = **8 visual permutations** the handle must look right in.
- Pointer capture release on pointerup, even on `pointercancel` (currently no `onPointerCancel` handler — minor pre-existing bug).

## 2. Drag handle design proposal

### 2.1 Component split

Add a new local sub-component inside `NavigationDock.tsx`:

```tsx
function DockDragHandle({ vertical, draggable, dragHandlers, isDragging }: ...)
```

It owns: the icon, the pointer event wiring (replaces wiring on container), its own hover/active/disabled visuals, ARIA + keyboard support.

### 2.2 Placement per edge

The handle goes **inside the pill, at the trailing end**:

| Edge     | Layout     | Handle position | Pill flex  |
| -------- | ---------- | --------------- | ---------- |
| `bottom` | horizontal | rightmost slot  | `flex-row` |
| `top`    | horizontal | rightmost slot  | `flex-row` |
| `left`   | vertical   | bottom slot     | `flex-col` |
| `right`  | vertical   | bottom slot     | `flex-col` |

Rationale: trailing edge in LTR locales, separates handle from primary nav at leading edge.

A subtle 1px divider (`bg-border-glass/50`) sits between the last nav button and the handle, mirroring the existing inner-edge highlight (`NavigationDock.tsx:512-517`).

### 2.3 Sizing

Use the exact dimensions returned by `getDockMetrics` so pill geometry is unchanged:

- Horizontal dock, no labels → `size-10` (40×40), matches existing items.
- Horizontal dock, with labels → match item height (`h-12`), narrower width (`w-6`, 24px) so handle reads as chrome, not a nav item.
- Vertical dock, no labels → `size-10`, icon centered.
- Vertical dock, with labels → match item width (`w-12`), narrow height (`h-6`).

### 2.4 Icon choice

- **Horizontal dock** (top/bottom edges) → `GripVertical` from `lucide-react`. Vertical column of dots = vertical "rail" you pinch sideways.
- **Vertical dock** (left/right edges) → `GripHorizontal`. Horizontal bar of dots you pinch up/down.

Icon size: `w-3.5 h-3.5` (14px). Color: `text-muted-foreground/50` rest, `text-foreground` hover, `text-primary` while dragging.

### 2.5 Hover / active / disabled states

```
rest:        text-muted-foreground/50, no background
hover:       text-foreground, bg-foreground/5, cursor-grab
active:      cursor-grabbing, bg-foreground/10
dragging:    text-primary, bg-primary/15
focus-visible: ring-2 ring-ring ring-offset-1 ring-offset-card
disabled (draggable=false): hidden entirely
```

The dragging-state highlight on the handle replaces the current "whole pill goes opacity-80 scale-95" — that effect can be toned down to `opacity-90` or removed.

### 2.6 When `draggable` is disabled in settings

**Hide the handle entirely.** Inert visible handle is design noise; pill width re-flows tighter when drag is off.

### 2.7 Accessibility

The handle is a real `<button type="button">` with:

- `aria-label="Przesuń dock"` (Polish — matches existing labels)
- `title` tooltip with the same text
- Focusable via Tab.
- Keyboard support (recommended, optional in v1):
  - `Arrow keys` while focused → nudge offset by ±5% along current edge axis.
  - `Shift+Arrow` perpendicular to current edge → switch edge.
  - `Home` / `End` → offset 5 / 95.
  - `Escape` → reset to default.

If keyboard support is too much for build phase, ship just the focusable button + aria-label + tooltip; file follow-up for shortcuts.

### 2.8 Integration with existing aesthetic

- Pill keeps `rounded-full`, glass blur, shadow — handle slot is **inside** the pill.
- Handle uses same border-radius scheme as nav items.
- No new shadow / no separate background.
- Active-pill sliding indicator (`getPillStyle`) is **not** affected: handle is rendered after `visibleItems.map(...)` and not in `visibleItems`, so `activeIndex` math is unchanged.

## 3. Collapsed (logo-only) mode

**Recommendation: Do not show a separate drag handle in collapsed mode.** Instead:

1. Wrap the logo in a real `<button>` with `aria-label="Rozwiń nawigację"` (currently a click-less `<div>`; only interaction is `onMouseEnter` — broken on touch).
2. Add explicit `onClick` calling `setExpanded(true)` — fixes a latent bug where touch/keyboard users cannot expand auto-hidden dock.
3. **Keep the pill as the drag surface in collapsed mode** but only when `draggable && !isExpanded`. Justification: no room for both a click target and separate handle in 40×40, and the user collapsed it precisely to get it out of the way — grabbing it to move is unambiguous.
4. Existing `hasDraggedRef` mechanism handles click vs drag — drift <5px → re-expand; drift ≥5px → drag.

**Alternative rejected**: tiny grip icon as 12×12 corner badge — clutters, breaks clean disc, tap-unfriendly.

## 4. State / store / hook changes

### `useDockDrag.ts` — keep as-is, just call site changes

The hook is already designed correctly. No need to change to accept a ref. Fixes at call site:

- **Full mode**: move handlers from pill `<div>` (`NavigationDock.tsx:486-488`) onto the new `<button>` inside `DockDragHandle`.
- **Collapsed mode**: keep handlers on the pill `<div>` (intentional exception per §3).

`hasDraggedRef` stays — collapsed mode still needs it.

**Recommended hook improvements:**

- Add `onPointerCancel` (mirrors `onPointerUp`) so pointer cancellation does not leave `isDragging=true`. Pre-existing latent bug.
- Reset `useDockStore.setState({ isDragging: false, dragPosition: null })` defensively in pointercancel.

### `useDockStore.ts` — no changes

State shape is fine. If keyboard nudging implemented, add `nudgeOffset(delta: number)` action. Optional.

### `NavigationDock.tsx` — moderate changes

1. Remove `onPointerDown/Move/Up` from full-mode pill `<div>` (lines 486-488).
2. Remove `cursor-grab active:cursor-grabbing` from full-mode pill (line 500).
3. Add `<DockDragHandle ... />` rendered after `visibleItems.map(...)` (line 545). Conditional on `draggable`.
4. Convert collapsed-mode wrapping `<div>` (lines 443-475) to `<button type="button">` with `onClick={() => setExpanded(true)}`, gated by `hasDraggedRef.current` to suppress click after drag.
5. Tone down `isDragging && 'opacity-80 scale-95'` on the pill to `opacity-95` or remove.

### `DockSection.tsx` — no changes (optional copy tweak)

"Przeciąganie" toggle description could be: _"Pokaż uchwyt do przesuwania docka"_. Minor polish.

## 5. Complexity classification: BUILD

**Files touched:** 2 modifications + 1 in-file sub-component

- `apps/web/src/components/shared/NavigationDock.tsx` — primary changes
- `apps/web/src/hooks/useDockDrag.ts` — small additions
- `apps/web/src/components/shared/__tests__/NavigationDock.test.tsx` — add tests

No store schema change. No new files mandatory. No cross-package impact. Behavior is additive + localized refactor.

## Recommended Fix Order

1. **(A11y, must do)** Convert collapsed-mode logo from `<div>` to `<button>` with `onClick={setExpanded(true)}` and proper aria-label.
2. **(Core)** Add `DockDragHandle` sub-component, render conditionally in full mode after `visibleItems.map`.
3. **(Core)** Remove pointer handlers + `cursor-grab` classes from full-mode pill container.
4. **(Polish)** Add `onPointerCancel` in `useDockDrag` for resilience.
5. **(Polish)** Tone down or remove the full-pill dragging dim.
6. **(Tests)** Update `NavigationDock.test.tsx`.
7. **(Optional follow-up)** Keyboard support on the handle.

## Open question

The collapsed-mode logo currently has **no click handler at all** — only `onMouseEnter`. On a touch screen or via keyboard, an auto-hidden dock cannot be re-expanded. Confirm:

- (a) Fix as part of this task (recommended, free win), OR
- (b) Defer to a separate "auto-hide a11y" task.

Recommended: (a) — 3-line change inside the same component.

## Key files (absolute)

- `P:/shiroani/apps/web/src/components/shared/NavigationDock.tsx`
- `P:/shiroani/apps/web/src/hooks/useDockDrag.ts`
- `P:/shiroani/apps/web/src/components/shared/__tests__/NavigationDock.test.tsx`
- `P:/shiroani/apps/web/src/stores/useDockStore.ts` (read-only reference)
- `P:/shiroani/apps/web/src/components/settings/DockSection.tsx` (read-only reference; copy tweak optional)
