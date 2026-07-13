# 17 — Mobile Layout 🚧

How the engine handles mobile devices (phone + tablet, landscape-only) across detection, UI mode preference, layout primitives, menu rendering, and per-app composition.

The plumbing is engine-level so any sibling app (`app-gmt`, `fluid-toy`, `fractal-toy`, `demo`) opts in by mounting a few primitives in its shell. There is no `installMobile()` plugin — instead, the pieces live where they naturally belong: a hook for detection, a slice for the user preference, components for layout, and an extension to the existing menu plugin for mobile menu rendering.

## Quick map

| Layer | What | File |
|---|---|---|
| Detection | `useMobileLayout()` hook + `isMobileSnapshot()` non-React helper. Both derive from store-backed `isDeviceMobile` / `isPortrait` flags maintained by a single global resize listener. | [hooks/useMobileLayout.ts](../../hooks/useMobileLayout.ts) |
| Preference | `uiModePreference: 'auto' \| 'mobile' \| 'desktop'` on the engine store, persisted to localStorage | [store/slices/uiSlice.ts](../../store/slices/uiSlice.ts) |
| Hardware tier | `HardwareProfile` from `detectHardwareProfile()` — drives auto-preset selection at boot | [engine/HardwareDetection.ts](../../engine/HardwareDetection.ts) |
| Layout | `<MobileViewportShell>` (root), `<LandscapeGate>` (rotate prompt) | [engine/components/MobileViewportShell.tsx](../../engine/components/MobileViewportShell.tsx), [engine/components/LandscapeGate.tsx](../../engine/components/LandscapeGate.tsx) |
| Menu rendering | `mobileMenu` façade + `<MobileMenuHost>` — menus replace the right dock instead of overflowing as popovers. Active-menu id lives on the store as `mobileActiveMenu`. | [engine/plugins/Menu.tsx](../../engine/plugins/Menu.tsx) |

## Detection

`useMobileLayout()` returns `{ isMobile, isPortrait }`.

- `isMobile` factors in the user's `uiModePreference`:
  - `'auto'` — `pointer: coarse` media query OR `window.innerWidth < 768`
  - `'mobile'` — forced true
  - `'desktop'` — forced false
- `isPortrait` always reflects actual orientation (used by `<LandscapeGate>`).

For predicate / non-React contexts (e.g. menu `when:` callbacks, install-time gates), `isMobileSnapshot()` returns the same boolean without subscribing.

## UI mode preference

A tri-state setting lives on the engine store as `uiModePreference`. The System menu exposes it as a three-button row (Auto / Force Mobile / Force Desktop). It persists to `localStorage` under `gmt.uiModePreference`.

This **replaces** the prior `debugMobileLayout: boolean` debug toggle. Auto is the default; users with edge-case devices (a tablet they want to use as a desktop, or a desktop browser they want to test mobile in) can override.

## Layout primitives

### `<MobileViewportShell>` — root wrapper

Swaps positioning between desktop and mobile:

- Desktop: `fixed inset-0 w-full h-full`
- Mobile: `sticky top-0 h-[100vh] overflow-hidden shadow-2xl`

The mobile branch implements the iOS Safari address-bar collapse trick — the `sticky` element matches the visual viewport on first paint, then sticks once the body scrolls 1px, allowing the browser to retract the address bar. `100vh` then resolves to the larger post-collapse viewport.

Also applies `padding: env(safe-area-inset-*)` on all four edges to keep UI clear of notches and gesture bars.

### `<LandscapeGate>`

Full-screen overlay shown on mobile + portrait. Mount conditionally (typically gated on the loading screen having finished):

```tsx
{!isLoadingVisible && <LandscapeGate />}
```

Renders nothing on desktop or in landscape — the `useMobileLayout` hook gates it internally.

## Menu rendering on mobile

The `@engine/menu` plugin handles desktop and mobile via the same registration API. The difference is in `<MenuAnchor>`:

- **Desktop:** clicking a menu button opens a local popover anchored under the button.
- **Mobile:** clicking a menu button writes its id to a module-level `mobileMenu` state. `<MobileMenuHost>` (mounted by the app shell where the right dock would live) reads that state and renders the menu's items in a scrollable side panel.

The `mobileMenu` API:

```ts
mobileMenu.open(id)        // set active
mobileMenu.close()         // clear
mobileMenu.toggle(id)      // open if not active, close if active
mobileMenu.getActive()     // -> string | null
mobileMenu.subscribe(fn)   // for useSyncExternalStore
```

App shells subscribe and gate their right-dock rendering:

```tsx
const activeMenu = useSyncExternalStore(mobileMenu.subscribe, mobileMenu.getActive, mobileMenu.getActive);
const isMobileMenuOpen = activeMenu !== null;

{isMobileMenuOpen && <MobileMenuHost />}
{!isMobileMenuOpen && /* …regular dock here… */}
```

The `MenuAnchor` highlights its button when its menu is the active mobile one, so visual state stays in sync.

## Performance auto-tuning

[useAppStartup.ts](../../hooks/useAppStartup.ts) calls `detectHardwareProfileMainThread()` after first hydration. If the profile reports `isMobile` and the current scalability preset is the engine default `'balanced'`, it downgrades to `'fastest'` to keep first-paint compile time under ~5 s. If the user has explicitly chosen any other preset (preview / lite / full / ultra), it's respected.

## Per-app composition (app-gmt example)

The app shell mounts engine primitives and decides where they live. From [`app-gmt/AppGmt.tsx`](../../app-gmt/AppGmt.tsx) (abbreviated):

```tsx
const { isMobile } = useMobileLayout();
const mobileActive = useSyncExternalStore(mobileMenu.subscribe, mobileMenu.getActive, mobileMenu.getActive);
const isMobileMenuOpen = mobileActive !== null;

return (
  <MobileViewportShell className="bg-black text-white …">
    {!loadingVisible && (
      <>
        <LandscapeGate />
        {!state.isBroadcastMode && <MobileControls />}
      </>
    )}
    <TopBarHost />
    <div className="flex-1 flex">
      {!isMobile && <Dock side="left" />}      {/* hidden on mobile */}
      <ViewportFrame>…</ViewportFrame>
      {isMobileMenuOpen && <MobileMenuHost />}
      {!isMobileMenuOpen && !(isMobile && cameraMode === 'Fly') && <Dock side="right" />}
    </div>
    {!isMobile && <TimelineHost />}            {/* timeline desktop-only */}
  </MobileViewportShell>
);
```

GMT-specific touches:
- Right dock hidden in Fly mode on mobile (joysticks need viewport reach).
- Timeline hidden entirely on mobile (animation editing is desktop-only; see plans/mobile-animation-research.md for the deferred design).
- `<MobileControls>` is a GMT-side joystick + mode-switch overlay; engine doesn't impose this, but the layout pattern (gate on `!loadingVisible && !isBroadcastMode`) is reusable.

## Topbar item culling

Items that should hide on mobile pass a `when:` predicate to `topbar.register`:

```tsx
import { isMobileSnapshot } from '../../hooks/useMobileLayout';
const desktopOnly = () => !isMobileSnapshot();
topbar.register({ id: 'adaptive', slot: 'left', order: 6, component: AdaptiveResolution, when: desktopOnly });
```

`TopBarHost` subscribes to `uiModePreference` and `isDeviceMobile`, so toggling Force Mobile in the System menu (or crossing the 768 px viewport breakpoint, or rotating across portrait/landscape on a hybrid) re-evaluates predicates live.

Installers that wrap a `topbar.register` call internally (e.g. `installBucketRender`) accept a `when?: () => boolean` option that's forwarded to the registration.

## Touch input

- Drei's `<OrbitControls>` already declares `touches={{ ONE: ROTATE, TWO: DOLLY_PAN }}`. The custom cursor-anchored orbit handlers in `engine-gmt/navigation/Navigation.tsx` early-return on `e.pointerType === 'touch'`, ceding to drei's native rotate / pan / zoom. Cursor-anchor doesn't translate to multi-touch, so this is the correct cede.
- `<MobileControls>` (joystick + mode-switch pill) handles Fly-mode camera input on touch.

## Sibling-app adoption checklist

To bring mobile support to another app on the engine:

1. Wrap the root in `<MobileViewportShell>`.
2. Mount `<LandscapeGate>` once the loading screen finishes.
3. Subscribe to `mobileMenu` and swap whatever lives in the right-dock slot for `<MobileMenuHost>` when active.
4. Hide app-specific desktop-only chrome (left dock, timeline, complex modals) when `isMobile`.
5. Use `useEngineStore` for the `uiModePreference` setting — the System menu's tri-state pill row is GMT-side; other apps register their own equivalent or omit if they don't need a force-override.
6. (Optional) Auto-pick a lighter scalability preset at boot when `hardwareProfile.isMobile`.

## Known limitations

- **Mobile menu outside-tap dismissal not implemented** — only the X button in `<MobileMenuHost>`'s header dismisses. Tapping the canvas / topbar leaves the menu open.

## Future work

The placeholder `@engine/environment` plugin row in [04_Core_Plugins.md](04_Core_Plugins.md) is a candidate to absorb `useMobileLayout` + theme + DPR into a single install-once primitive. The mobile detection layer is already store-backed and ready to fold in.

Animation on mobile is researched in [plans/mobile-animation-research.md](../../plans/mobile-animation-research.md) (deferred — too much scope for the initial mobile pass).
