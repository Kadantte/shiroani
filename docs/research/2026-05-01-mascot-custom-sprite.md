# Custom Mascot Sprite — Research & Implementation Plan

**Date:** 2026-05-01
**Agent:** kirei-ui
**Stack:** Electron + React (Vite, `apps/web`) + main process (`apps/desktop`) + native Win32 N-API addon (C++/GDI+)
**Scope:** Audit current mascot rendering on both surfaces (Settings preview + draggable on-desktop sprite), audit the existing custom-background-image flow as the reference pattern, then design a parallel custom-sprite flow.
**Overall complexity:** **COMPLEX** — touches renderer state, IPC layer, preload bridge, both platform-specific overlay backends (Win32 native + macOS BrowserWindow), shared types, and adds a new privileged protocol.

---

## 1. Current mascot rendering architecture

### 1.1 Two surfaces, very different rendering

| Surface                                     | File                                                    | How sprite is loaded                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Settings → Mascot preview (`MascotPreview`) | `apps/web/src/components/settings/MascotPreview.tsx:86` | `<img src={APP_LOGO_URL}>` where `APP_LOGO_URL = "${BASE_URL}shiro-chibi.svg"` (see `apps/web/src/lib/constants.ts:4`) — this is the in-app SVG logo, **not** the actual desktop overlay sprite.                                                                                                                                                                         |
| In-app draggable mascot (Windows)           | `apps/desktop/src/native/desktop_overlay.cpp`           | Native Win32 layered window. GDI+ loads `chibi_base.png` from disk (`LoadBaseImage`, line 161). Sprite path passed in at `createOverlay({ spritePath })` (line 750) and can be hot-swapped via `setAnimation({ sheetPath })` (line 827) → `WM_CHANGE_ANIM` → `LoadBaseImage` → `RebuildScaledImage`.                                                                     |
| In-app draggable mascot (macOS)             | `apps/desktop/src/main/mascot/overlay-macos.ts`         | A frameless transparent `BrowserWindow` loads `mascot-overlay.html` (`apps/desktop/src/renderer/mascot-overlay.html`); main process reads `chibi_base.png`, base64-encodes it, and pushes it via `mascot:config` IPC. Already exposes a runtime sprite-swap channel `mascot:set-sprite` (preload `mascot-preload.ts:30`, main `setDarwinSprite` `overlay-macos.ts:265`). |

### 1.2 Sprite resolution today

Both platforms hard-code the default sprite path:

- Win32 path: `apps/desktop/src/main/mascot/overlay-windows.ts:99-100`
  ```ts
  const resourcesPath = getResourcesPath(); // resources/mascot in dev, process.resourcesPath/mascot when packaged
  const spritePath = path.join(resourcesPath, 'chibi_base.png');
  ```
- macOS path: `apps/desktop/src/main/mascot/overlay-macos.ts:108-116`
  ```ts
  const spriteFile = path.join(getResourcesPath(), 'chibi_base.png');
  const data = await fs.promises.readFile(spriteFile);
  spriteSrc = `data:image/png;base64,${data.toString('base64')}`;
  ```

Default assets live in `apps/desktop/resources/mascot/`: `chibi_base.png`, plus alt poses (`chibi_sleep.png`, `chibi_think.png`, `chibi_wave.png`) and frame sheets (`idle_sheet.png`, `sit_sheet.png`).

### 1.3 Animation reality

The Win32 native side does **not** play sprite-sheet frames any more — the comment on `desktop_overlay.cpp:13` confirms it uses a single base PNG and computes a sinusoidal bob in real time at ~60fps (constants `BOB_AMPLITUDE = 3.0`, `BOB_PERIOD_SEC = 2.5`, lines 60-62). This is a major simplification for our purposes: a custom sprite only needs to be **one PNG with alpha** — no frame-count contract to respect. The `frameCount` / `frameWidth` parameters in the addon's `createOverlay` / `setAnimation` API are effectively legacy and ignored by the renderer (the addon's internal `AnimChangeData.frameCount` is overwritten to `1` in `SetAnimation`, line 838).

The macOS overlay does an even simpler `<img src=…>` with a CSS `@keyframes bob` (mascot-overlay.html:39-42). It also has no frame-sheet logic.

**Implication:** custom sprite support is effectively "swap one PNG (with transparency) and re-render". The native addon already supports this end-to-end; the macOS path already supports it end-to-end. We just need to wire user choice through.

### 1.4 IPC surface for the overlay (current)

Renderer-facing channels (`apps/desktop/src/main/ipc/overlay.ts`, registered from `apps/desktop/src/main/ipc/register.ts:43`-ish):

- `overlay:show` / `overlay:hide` / `overlay:toggle`
- `overlay:set-position` / `overlay:get-status`
- `overlay:set-enabled` / `overlay:is-enabled`
- `overlay:set-size` / `overlay:get-size`
- `overlay:set-visibility-mode` / `overlay:get-visibility-mode`
- `overlay:set-position-locked` / `overlay:get-position-locked`
- `overlay:reset-position`

All allowlisted in `apps/desktop/src/main/preload/_shared.ts:73-86`. Typed in `packages/shared/src/types/electron-api.ts:160-175`.

There is currently **no** IPC channel for choosing or removing a custom sprite. None of the existing `overlay:*` channels carry a sprite path.

### 1.5 Settings store (Electron)

Per-user mascot settings live in `electron-store` under the `settings.*` namespace (`apps/desktop/src/main/mascot/overlay-state.ts`):

- `settings.mascotEnabled`
- `settings.mascotSize`
- `settings.mascotVisibilityMode`
- `settings.mascotPosition`
- `settings.mascotPositionLocked`

There is no `settings.mascotSprite` key today.

---

## 2. Reference pattern: custom background image flow

The custom background flow is the model the user explicitly asked us to mirror. Same level of detail:

### 2.1 Main-process IPC + protocol — `apps/desktop/src/main/ipc/background.ts`

- **Storage location:** `app.getPath('userData')/backgrounds/` (created lazily by `getBackgroundsDir`, line 33).
- **Allowed extensions:** `png`, `jpg`, `jpeg`, `gif`, `webp` (line 18).
- **Max file size:** 20 MB (line 21).
- **Filename safety:** rejects `..`, `/`, `\`, `\0` (`isUnsafeFileName`, line 26) and refuses anything that resolves outside the backgrounds dir (containment check, lines 88-92).
- **Custom protocol:** `shiroani-bg://backgrounds/<file>` (registered in `apps/desktop/src/main/index.ts:67-78` as a _privileged_ scheme **before `app.ready`**, then `protocol.handle` is called inside `registerBackgroundProtocol`, line 56). Requests are validated, then served via `net.fetch(pathToFileURL(filePath).href)` for correct Windows/Unicode encoding (lines 99-102).
- **CSP allowance:** `apps/desktop/src/main/window.ts:44` adds `shiroani-bg:` to `img-src`.
- **IPC channels:**
  - `background:pick` — opens native dialog (`dialog.showOpenDialog`), validates, copies to `userData/backgrounds/bg-<uuid>.<ext>` via `randomUUID`-prefixed name (line 148), returns `{ fileName, url }`.
  - `background:remove` — unlinks the named file from disk.
  - `background:get-url` — returns `shiroani-bg://backgrounds/<name>` only if file still exists (used on app startup to verify a saved choice still resolves).
- **Schemas:** `apps/desktop/src/main/ipc/schemas.ts:184-186`. All three channels are also allowlisted in `apps/desktop/src/main/preload/_shared.ts:41-43`.

### 2.2 Preload bridge — `apps/desktop/src/main/preload/background.ts`

```ts
export const backgroundApi: ElectronAPI['background'] = {
  pick: () => ipcRenderer.invoke('background:pick'),
  remove: fileName => ipcRenderer.invoke('background:remove', fileName),
  getUrl: fileName => ipcRenderer.invoke('background:get-url', fileName),
};
```

Wired into the `electronAPI` global at `apps/desktop/src/main/preload/index.ts:29`. Type contract in `packages/shared/src/types/electron-api.ts:77-81`.

### 2.3 Renderer state — `apps/web/src/stores/useBackgroundStore.ts`

Zustand store that owns:

- `customBackground: string | null` — the protocol URL (used at render time)
- `customBackgroundFileName: string | null` — used for cleanup/removal
- `backgroundOpacity`, `backgroundBlur` (mascot won't need these)
- `backgroundLoaded: boolean` — avoids re-applying defaults during hydration

Persistence: a single `electron-store` key `'custom-backgrounds'` holds `{ fileName, url, opacity, blur }`. Reads/writes go through `electronStoreGet/Set/Delete` (`apps/web/src/lib/electron-store.ts`) which proxy to the generic `store:get|set|delete` IPC. Writes are debounced 300ms (line 101).

Lifecycle:

- `pickBackground` calls `background:pick`, deletes the previous file via `background:remove`, updates store, applies CSS custom properties, persists.
- `removeBackground` calls `background:remove`, resets state to defaults, clears CSS properties, persists `null`.
- `restoreBackground` is invoked on app init (from `useSettingsStore.ts:286`) — looks up the saved `fileName`, calls `background:get-url` to verify it still resolves, applies if present, otherwise clears persisted settings (graceful self-heal).

### 2.4 Renderer UI

- `BackgroundPanel` (`apps/web/src/components/shared/BackgroundPanel.tsx`) is the shared picker — a 16:9 preview tile, "Wybierz obraz" / "Usuń tło" buttons, opacity + blur sliders. Has a `card` and `onboarding` variant.
- `BackgroundOverlay` (`apps/web/src/components/shared/BackgroundOverlay.tsx`) renders the actual fixed background div by reading CSS custom properties + the live opacity from the store.

### 2.5 Notable design choices we should preserve

- **Privileged custom protocol** instead of `file://` URIs in renderer — avoids CSP / WebSecurity headaches and gives one clean URL form for both display and serialization.
- **UUID-prefixed filenames** so collisions and human-readable PII are avoided.
- **Containment + extension whitelist + size limit on every channel** — defence in depth.
- **Self-healing restore** — if file vanished out-of-band, the store quietly clears its memory of it.

---

## 3. Gap analysis: what changes to mirror this for the mascot

| Reference (background)                                             | Mascot equivalent needed                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol.handle('shiroani-bg', …)` + privileged registration      | New protocol `shiroani-mascot://sprites/<file>` with the same security envelope. Used by **macOS only** (renderer-side `<img>`). Win32 native loads from absolute filesystem path directly — protocol URL not needed there.                                                                                                                                                                                                       |
| `userData/backgrounds/` dir                                        | `userData/mascot-sprites/` dir                                                                                                                                                                                                                                                                                                                                                                                                    |
| `background:pick` / `background:remove` / `background:get-url` IPC | `mascot:pick-sprite` / `mascot:remove-sprite` / `mascot:get-sprite-url` _(new — note the `mascot:_`namespace already exists for preload-side draggable IPC; we should namespace the new ones as`overlay:_`to keep the existing mental model: every renderer→main channel that touches the desktop mascot is`overlay:_`)*. **Recommendation:** name them `overlay:pick-sprite`, `overlay:remove-sprite`, `overlay:get-sprite-url`. |
| `background:pick` opens dialog and **copies** file                 | Same — copy into `userData/mascot-sprites/sprite-<uuid>.png`. **PNG-only** for the mascot (we need alpha + the native addon's GDI+ loader handles PNG cleanly; GIF/WEBP would produce visual artefacts on the layered Win32 window because the alpha buffer is sampled at load time, not animated). Allow `png`, `webp` (static frame, alpha) at most.                                                                            |
| Allowed extensions: `png/jpg/jpeg/gif/webp`                        | **`png` only** (strongly recommended) — JPEG has no alpha so the mascot would render with a hard rectangle; GIF would only show frame 0; static WEBP could work but adds complexity. Lock down to PNG for v1; we can relax later.                                                                                                                                                                                                 |
| Max size 20 MB                                                     | **2 MB** is plenty for a sprite — protects against absurdly large transparent PNGs the GDI+ rebuild path would otherwise resize on every resize event.                                                                                                                                                                                                                                                                            |
| Renderer state in `useBackgroundStore`                             | New Zustand store `apps/web/src/stores/useMascotSpriteStore.ts` with `customSpriteUrl`, `customSpriteFileName`, `spriteLoaded` — **no opacity/blur**. Persistence key: `'custom-mascot-sprite'`.                                                                                                                                                                                                                                  |
| Component `BackgroundPanel` (preview + pick/remove + sliders)      | Replace the static preview in `MascotPreview.tsx` with a sprite-aware preview that shows the **active sprite** (custom if set, otherwise default `APP_LOGO_URL` or — better — the actual `chibi_base.png` served via the new protocol). Add a "Wybierz sprite" / "Resetuj do domyślnego" button row in `MascotSection.tsx`.                                                                                                       |
| `restoreBackground` invoked from `useSettingsStore.initSettings`   | Same — `restoreSprite()` invoked from the same place, gated on platform = electron. After restore, push the resolved absolute path to the running overlay so the desktop sprite updates without a restart.                                                                                                                                                                                                                        |
| CSP `img-src` includes `shiroani-bg:`                              | Add `shiroani-mascot:` too (`apps/desktop/src/main/window.ts:44`).                                                                                                                                                                                                                                                                                                                                                                |

**Critical asymmetry that complicates this vs. the background:** the background image is rendered in the _main_ renderer's DOM only. The mascot sprite has to reach **two completely different rendering systems** — Win32 native GDI+ (file path) and macOS BrowserWindow (we already have `mascot:set-sprite` IPC to push a base64 data URL or, after this change, the `shiroani-mascot://` URL). Both code paths exist; we just need to wire them.

### 3.1 Wiring the sprite update at runtime

When the user picks a new sprite:

1. Renderer calls `overlay:pick-sprite` → main copies file to `userData/mascot-sprites/sprite-<uuid>.png`, returns `{ fileName, url, absolutePath }`.
2. Main process needs to **immediately push the new sprite to the live overlay**:
   - Win32: call `setMascotAnimation(absolutePath, 1, getMascotSize(), 16)` — already implemented in `overlay.ts:135`. The native addon will reload via `LoadBaseImage` and re-render.
   - macOS: call `setDarwinSprite(<protocol-url-or-data-url>)` — already implemented in `overlay-macos.ts:265`. Renderer-side `mascot-overlay.html:87` already listens for `mascot:set-sprite` and updates `mascot.src`.
3. On reset: same flow, with the default `chibi_base.png` from the resources dir.

### 3.2 Persistence + startup

Persist `{ fileName }` under a single `electron-store` key, e.g. `settings.mascotCustomSprite`. On `createMascotOverlay()` startup, instead of unconditionally using `chibi_base.png`, resolve "active sprite" = (custom path if file exists, else default). Add a helper `getActiveMascotSpritePath()` in `overlay-state.ts` next to `getMascotSize()`.

### 3.3 Settings preview surface

`MascotPreview.tsx` currently shows three SVG silhouettes via `APP_LOGO_URL`. Two reasonable options:

- **Minimal (recommended for v1):** read `customSpriteUrl` from the new store; if set, render that in the three preview tiles instead of `APP_LOGO_URL`. Default fallback unchanged.
- **Higher fidelity:** also serve the actual `chibi_base.png` via the new protocol so the preview matches what users see on the desktop. Slightly more work (need a stable URL like `shiroani-mascot://sprites/__default__` that resolves to the bundled asset) but the preview becomes truthful.

---

## 4. Implementation plan, file-by-file (ordered)

Each file is tagged **[BUILD]** (mechanical, low-risk, fits kirei-build) or **[FORGE]** (design-load-bearing, multi-file, fits kirei-forge).

### Phase A — main process: protocol, IPC, persistence

1. **[FORGE]** `apps/desktop/src/main/ipc/sprite.ts` _(new)_ — mirror `background.ts`:
   - `getSpritesDir()` → `userData/mascot-sprites/`
   - `registerMascotSpriteProtocol()` → `protocol.handle('shiroani-mascot', …)` with the same containment/extension guards. Allow `png`, `webp` (start with PNG only — opt-in extension widening later).
   - Expose a special path `shiroani-mascot://sprites/__default__` that resolves to the bundled `resources/mascot/chibi_base.png` so renderer and macOS overlay can use a single URL form for both default and custom.
   - IPC handlers `overlay:pick-sprite`, `overlay:remove-sprite`, `overlay:get-sprite-url`.
   - `pick-sprite` should **also** call into a new helper `applyActiveSpriteToOverlay()` so the change is live without a renderer round-trip.
2. **[BUILD]** `apps/desktop/src/main/ipc/schemas.ts` — add `mascotPickSpriteSchema`, `mascotRemoveSpriteSchema`, `mascotGetSpriteUrlSchema` next to the background schemas (line 184).
3. **[BUILD]** `apps/desktop/src/main/index.ts` — register `shiroani-mascot` as privileged before `app.ready` (extend the `protocol.registerSchemesAsPrivileged` call at lines 67-78), and call `registerMascotSpriteProtocol()` from the same place that calls `registerBackgroundProtocol()` (line 286).
4. **[BUILD]** `apps/desktop/src/main/window.ts:44` — add `shiroani-mascot:` to `img-src` CSP.
5. **[BUILD]** `apps/desktop/src/main/ipc/register.ts` — register the new sprite handlers alongside existing overlay/background handlers.
6. **[BUILD]** `apps/desktop/src/main/mascot/overlay-state.ts` — add `getCustomSpriteFileName()`, `setCustomSpriteFileName(name|null)`, `getActiveSpritePath()` (returns the absolute path to the custom file if it exists in `userData/mascot-sprites/`, else the bundled default).
7. **[FORGE]** `apps/desktop/src/main/mascot/overlay.ts` — add `applyActiveSprite()`:
   - Win32: `setMascotAnimation(getActiveSpritePath(), 1, getMascotSize(), 16)`.
   - macOS: read the active sprite, base64-encode (or use `shiroani-mascot://` URL — preferred to keep memory low), call `setDarwinSprite(url)`.
   - Make `createWin32Overlay` and `createMacOverlay` use `getActiveSpritePath()` instead of the hard-coded `chibi_base.png` paths (`overlay-windows.ts:99-100`, `overlay-macos.ts:108-109`).
8. **[BUILD]** `apps/desktop/src/main/preload/sprite.ts` _(new)_ or extend `apps/desktop/src/main/preload/overlay.ts` — expose `pickSprite`, `removeSprite`, `getSpriteUrl` on the existing `overlay` namespace in `electronAPI`.
9. **[BUILD]** `apps/desktop/src/main/preload/_shared.ts` — allowlist `overlay:pick-sprite`, `overlay:remove-sprite`, `overlay:get-sprite-url` (lines 73-86 area).
10. **[BUILD]** `packages/shared/src/types/electron-api.ts:160-175` — extend the `overlay` block:
    ```ts
    pickSprite: () => Promise<{ fileName: string; url: string } | null>;
    removeSprite: () => Promise<void>;
    getSpriteUrl: (fileName: string) => Promise<string | null>;
    ```

### Phase B — renderer state

11. **[FORGE]** `apps/web/src/stores/useMascotSpriteStore.ts` _(new)_ — Zustand store mirroring `useBackgroundStore.ts` (without opacity/blur). Persistence key: `'custom-mascot-sprite'`. Actions: `pickSprite`, `removeSprite`, `restoreSprite`. After `pickSprite` and `removeSprite`, the main process already pushed the change to the live overlay; the renderer just needs to update its own copy for the preview.
12. **[BUILD]** `apps/web/src/stores/useSettingsStore.ts:286` — also call `useMascotSpriteStore.getState().restoreSprite()` next to `restoreBackground()`.

### Phase C — renderer UI

13. **[FORGE]** `apps/web/src/components/settings/MascotSection.tsx` — add a new card section (or extend the existing one) above the size slider:
    - "Własny sprite" preview (current sprite, custom or default)
    - "Wybierz sprite" + "Resetuj do domyślnego" buttons (mirrors `BackgroundPanel`'s actionBar)
    - Helper text: "PNG z przezroczystością · maks. 2 MB"
14. **[BUILD]** `apps/web/src/components/settings/MascotPreview.tsx:86` — replace `APP_LOGO_URL` with `customSpriteUrl ?? APP_LOGO_URL` (read from the new store). Keep the SVG fallback so the preview never breaks.

### Phase D — verification + housekeeping

15. **[BUILD]** Test files: clone `apps/desktop/src/main/ipc/__tests__/background.test.ts` shape into `__tests__/sprite.test.ts` — same protocol containment / unsafe-name / extension / nonexistent-file cases.
16. **[BUILD]** Update `apps/desktop/src/main/preload/_shared.ts` allow-list count check in any tests that count the constant size.
17. **[BUILD]** Verify packaged bundle copies the bundled defaults — `apps/desktop/electron-builder.json` already includes the mascot resources (already grep-confirmed: file references the `mascot` resource path), no change expected; double-check during build.

---

## 5. Edge cases & open questions for the user to confirm before implementation

1. **Format scope:** PNG-only for v1, or do we want to allow WEBP (static) too? GIF/JPEG are off the table (no animation support after the bob refactor; no alpha respectively). Recommendation: **PNG-only** to start.
2. **Aspect ratio handling:** the native overlay scales to a square (`g_displaySize × g_displaySize`, `desktop_overlay.cpp:183`). A non-square user sprite will be **stretched**. Three options:
   - (a) Scale to fit and letterbox transparently (preserve aspect, requires native code change).
   - (b) Pre-validate dimensions on import and reject non-square uploads with a clear error.
   - (c) Stretch (current behaviour, ugly for non-square inputs).
     Recommendation: **(b)** for v1 — cheaper and gives a clear UX message. Revisit (a) if users complain.
3. **Maximum input dimensions:** beyond size-on-disk, do we cap dimensions (e.g. 1024×1024)? GDI+ scales fine but huge sources waste memory on every `RebuildScaledImage`. Recommendation: 2048×2048 hard cap, validated in the picker.
4. **macOS support:** macOS overlay is supported but distinct (BrowserWindow + base64 / protocol URL). Confirm we want sprite override on both platforms in v1, or Windows-only initially with macOS following.
5. **Linux:** project has no Linux build yet (per `feedback`/`project_macos_install` memory). No work needed here, but confirm.
6. **Reset semantics:** on "Resetuj do domyślnego", should we **delete** the user's uploaded file from `userData/mascot-sprites/`, or keep it and just stop pointing at it? The background flow deletes (`useBackgroundStore.removeBackground` → `background:remove`). Recommendation: same — delete on reset for clarity and disk hygiene.
7. **Multiple sprites / library?** Background flow stores exactly one custom file at a time. Same model proposed here — keep it simple, no sprite library in v1.
8. **Animation interaction:** the bob animation (Win32 sinusoidal, macOS CSS) is **always on** and doesn't depend on the sprite. A user-supplied static sprite will bob just like the default. No work needed; worth documenting in the UI helper text so users aren't surprised.
9. **Live update across windows:** since the mascot is a separate window (Win32 native or macOS BrowserWindow), the main process is the single source of truth. The plan above (main process pushes on pick/remove) handles this naturally — no broadcast needed.
10. **Validation feedback:** the background flow throws on too-large files — the renderer should surface a toast. Mirror the same error envelope and wire to the existing toast system (look in `apps/web/src/components/ui` for the toast helper used by background flow).
11. **Tray icon:** the `iconPath` parameter to the native addon is the tray icon, not the sprite. We do **not** swap that; tray stays the app's `icon.ico`.

---

## 6. Recommended fix order (implementation sequence)

1. Phase A files in order 1 → 10 (main process plumbing, types).
2. Phase B (renderer store) — testable in isolation against the new IPC.
3. Phase C (UI) — depends on B.
4. Phase D (tests + housekeeping) — landed alongside the relevant phase or in a follow-up commit.

The `[FORGE]` items (1, 7, 11, 13) are the load-bearing pieces that need design judgement — protocol / state lifecycle / UX — and benefit from kirei-forge. The remaining `[BUILD]` items are mechanical mirrors of existing patterns and fit kirei-build.

**Overall execute complexity: COMPLEX → kirei-forge.**

---

## 7. Confirmed decisions (2026-05-01, from user)

These override the recommendations in §5 where they differ. Implement to these:

1. **Formats:** Accept **PNG, JPEG, GIF, WEBP**. Validate by extension AND magic bytes (mirror background flow's containment + extension guards). For animated GIF specifically, the Win32 native loader currently treats input as a single image — load **frame 0 only** for v1; do not block animated GIFs at the picker, just document that they render as a static frame. (If first-frame extraction needs explicit GDI+ `FrameDimension` handling on the C++ side, do it; do not push animation playback into the native renderer in this slice.)
2. **Aspect ratio: configurable per custom image.** Drop the square-only constraint. Add a per-sprite `scaleMode` setting on the renderer side (default `contain`; allow `cover` and `stretch`). The native overlay's `RebuildScaledImage` currently fits to a square — extend the addon's `setAnimation` payload (and `createOverlay`) with a `scaleMode` field, and adjust the C++ scaler accordingly. Persist `scaleMode` alongside the sprite path in electron-store.
3. **Platforms: Windows only.** macOS support has been dropped from the project. As part of this work, **remove all macOS overlay code paths and references**, including but not limited to:
   - `apps/desktop/src/main/mascot/overlay-macos.ts`
   - `apps/desktop/src/renderer/mascot-overlay.html`
   - `apps/desktop/src/main/mascot/mascot-preload.ts` (if macOS-only — verify)
   - `mascot:set-sprite` / `mascot:config` IPC channels and any preload exposure
   - Any `process.platform === 'darwin'` branches in `overlay.ts`, `overlay-state.ts`, `register.ts`, etc.
   - Any tests that exercise macOS-only overlay paths
     Be thorough — grep for `darwin`, `macos`, `mascot-overlay.html`, `setDarwinSprite`, `mascot:set-sprite`, `mascot:config` and clean up everything.
4. **Reset semantics:** **Delete the file from disk** on reset, matching the background flow exactly (`useBackgroundStore.removeBackground` → `background:remove`).
5. **Limits:** **10 MB file cap**, 2048×2048 dimension cap. The bumped MB limit is to accommodate GIFs.

### Decision-driven plan deltas

- `apps/desktop/src/native/desktop_overlay.cpp`: GDI+ already supports PNG/JPEG/GIF/WEBP via `WIC` decoders bundled with `Image::FromFile` — verify, and explicitly select frame 0 for multi-frame inputs. Add `scaleMode` enum to the addon API and update `RebuildScaledImage` to honor it (currently fits-to-square; needs `contain`, `cover`, `stretch` branches preserving alpha).
- `apps/desktop/src/main/ipc/sprite.ts`: Validation accepts `png|jpg|jpeg|gif|webp`. File-size check uses 10 MB. Magic-byte sniffing per format.
- `apps/desktop/src/main/preload/sprite.ts` + shared types: `customSpritePath: string | null` and `customSpriteScaleMode: 'contain' | 'cover' | 'stretch'`.
- `apps/web/src/stores/useMascotSpriteStore.ts`: Expose `scaleMode` + setter. Hydrate from settings on startup.
- `apps/web/src/components/settings/MascotSection.tsx`: File picker (accept all 4 formats), scale-mode selector (radio or segmented control), reset button. Helper text noting "Animated GIFs render as a single frame for now."
- `MascotPreview.tsx:86`: Honor both `customSpriteUrl` and `scaleMode` (apply CSS `object-fit` to mirror what the native overlay does).
- macOS removal happens **first** in the implementation sequence so subsequent edits don't have to thread cross-platform branches that are about to be deleted anyway.
