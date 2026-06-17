---
source: hooks/useMobileLayout.ts
lines: 71
last_verified_sha: 2cfa06777ebaae51c0fa641292c3e4f1b90be8d9
additional_sources:
  - engine/components/LandscapeGate.tsx
  - engine/components/MobileScrollIntro.tsx
  - engine/components/MobileViewportShell.tsx
audited: 2026-05-20T08:55:00Z
audited_by: claude-opus-4-7
public_api:
  - isMobileSnapshot
  - useMobileLayout
  - LandscapeGate
  - MobileScrollIntro
  - MobileViewportShell
depends_on: []
---

# Mobile Layout

The engine's mobile-layout subsystem is four small files: one hook module that owns detection and gating state (hooks/useMobileLayout.ts:1-71), plus three layout primitives that consume the hook to swap visual shape on real touch devices (engine/components/LandscapeGate.tsx, engine/components/MobileScrollIntro.tsx, engine/components/MobileViewportShell.tsx). Detection is one breakpoint heuristic (`matchMedia('(pointer: coarse)') || innerWidth < 768`) reseeded into the engine store by a single module-level resize listener (hooks/useMobileLayout.ts:5-7, 25-37). Consumers pick between a preference-aware `isMobile` flag (Force-Mobile-on-desktop honoured) and a raw `isDeviceMobile` flag (Force-Mobile-on-desktop ignored) — the asymmetric policy is load-bearing.

## Public API

| Symbol | Kind | Location | Notes |
|---|---|---|---|
| `isMobileSnapshot()` | function | hooks/useMobileLayout.ts:45-48 | Non-reactive predicate. Reads `uiModePreference` + `isDeviceMobile` via `useEngineStore.getState()`; safe in `when:` callbacks, unsafe inside renders (no subscription). |
| `useMobileLayout()` | hook | hooks/useMobileLayout.ts:66-71 | Reactive. Subscribes to three engine-store fields and returns `{ isPortrait, isDeviceMobile, isMobile }` where `isMobile = resolveIsMobile(uiModePreference, isDeviceMobile)`. |
| `LandscapeGate` | React.FC (named export) | engine/components/LandscapeGate.tsx:15 | No props. Full-screen `fixed inset-0 z-[9999]` "rotate device" overlay; mounts only when `isDeviceMobile && isPortrait` (engine/components/LandscapeGate.tsx:18-19, 22-27). |
| `MobileScrollIntro` | React.FC (named export) | engine/components/MobileScrollIntro.tsx:29-32 | Props `{ title?: string; subtitle?: string }`, defaults `'GMT'` / `'Swipe up to enter'`. Renders a `100svh` banner ahead of the shell so the page has scroll capacity to retract the iOS address bar (engine/components/MobileScrollIntro.tsx:42-55). |
| `MobileViewportShell` | React.FC (named export) | engine/components/MobileViewportShell.tsx:37 | Props `{ children, className? }`. Mobile branch is `sticky top-0 h-[100dvh] overflow-hidden shadow-2xl` plus `env(safe-area-inset-*)` padding; desktop branch is `fixed inset-0 w-full h-full` (engine/components/MobileViewportShell.tsx:29-34, 44-50). |

Module side-effect: importing `hooks/useMobileLayout.ts` installs a global `window.resize` listener that writes `{ isDeviceMobile, isPortrait }` into the engine store (hooks/useMobileLayout.ts:25-37). There is no `installMobile()`; the import itself is the install step.

## Architecture

- Detection is one heuristic, one place: `detectIsMobileDevice = matchMedia('(pointer: coarse)').matches || innerWidth < 768` (hooks/useMobileLayout.ts:5-7). Orientation is `innerHeight > innerWidth` (strict `>`, so a square viewport counts as landscape) (hooks/useMobileLayout.ts:9-10).
- A single module-level resize listener, installed at first import inside `if (typeof window !== 'undefined')`, writes both flags into `useEngineStore` whenever either crosses a threshold. An inequality guard (`s.isDeviceMobile !== … || s.isPortrait !== …`) prevents redundant Zustand notifications for resizes that don't flip a flag (hooks/useMobileLayout.ts:25-37).
- The listener is never removed. The header comment explicitly states this: "No removeEventListener — module-level singleton, lives for the lifetime of the app. The store outlives any component" (hooks/useMobileLayout.ts:35-37).
- `uiModePreference: 'auto' | 'mobile' | 'desktop'` is the tri-state user preference, persisted to `localStorage` under `'gmt.uiModePreference'`; the resolution function `resolveIsMobile(pref, isDeviceMobile)` returns `true` for `'mobile'`, `false` for `'desktop'`, else the raw device flag (hooks/useMobileLayout.ts:12-16). The store field lives in the engine-shared `uiSlice`; see plans/doc-audit-state/survey/e12-mobile-layout.md line 41 for the slice citation.
- `useMobileLayout()` reads three Zustand fields and exposes both interpretations of mobility so each call site can pick its own gating policy. The header comment (hooks/useMobileLayout.ts:50-65) documents which flag belongs in which role.
- `isMobileSnapshot()` is the non-reactive cousin: it calls `useEngineStore.getState()` and applies the same `resolveIsMobile` (hooks/useMobileLayout.ts:45-48). It does not subscribe — fine for menu/topbar `when:` predicates re-evaluated by the host on every relevant store update; unsafe inside `render()` since change won't trigger re-render. The followup q-008 walks the topbar's specific consumption pattern (predicate form for `when:`, hook form inside React subcomponents).
- **The intro/shell pair is the address-bar collapse mechanism.** Intro is `height: 100svh` — the *small* viewport, the height with the address bar visible (engine/components/MobileScrollIntro.tsx:42-45). Shell is `h-[100dvh]` — the *dynamic* viewport that tracks the live viewport size (engine/components/MobileViewportShell.tsx:6-13, 44-45). Their combined height always exceeds the visible viewport by at least the address-bar height, giving the body scroll capacity. Swipe up → bar retracts → sticky shell locks (engine/components/MobileScrollIntro.tsx:12-16). `dvh` (not `vh`) tracks the live viewport so the shell also re-fits when the mobile keyboard opens/closes (engine/components/MobileViewportShell.tsx:6-9).
- `MobileViewportShell` applies `env(safe-area-inset-{top,bottom,left,right})` padding on all four edges of the mobile branch via a frozen `MOBILE_STYLE` object; the desktop branch uses an empty style object (engine/components/MobileViewportShell.tsx:29-35).
- `LandscapeGate` is a `fixed inset-0 z-[9999] bg-black` overlay with a bouncing rotate icon and copy ("Landscape Recommended" / "Rotate device to access controls.") (engine/components/LandscapeGate.tsx:22-26).
- The three primitives are not auto-mounted by any engine plugin; the app shell places them. The intro must precede the shell in DOM order for the scroll-trigger mechanism to work (engine/components/MobileScrollIntro.tsx:7-16).

## Invariants

- **Asymmetric gating is load-bearing.** `LandscapeGate`, `MobileScrollIntro`, and `MobileViewportShell` all consume the raw `isDeviceMobile` flag so that Force-Mobile-on-desktop does *not* trigger rotate prompts, render a 100svh banner over the desktop browser (whose `overflow:hidden` body would deadlock — see the inline rationale at engine/components/MobileScrollIntro.tsx:33-40), or apply sticky layout to a non-touch viewport (engine/components/LandscapeGate.tsx:16-19, engine/components/MobileScrollIntro.tsx:33-40, engine/components/MobileViewportShell.tsx:38-42). Consumers of preference-aware mobile UI (joysticks, mobile menu host, hidden desktop chrome) use `isMobile` instead — see hooks/useMobileLayout.ts:56-63 for the contract.
- **Importing `hooks/useMobileLayout.ts` is the install step.** There is no `installMobile()` plugin. If no module ever imports the hook, the store's `isDeviceMobile` / `isPortrait` flags stay frozen at whatever the slice initializer seeded; the resize listener is what keeps them current (hooks/useMobileLayout.ts:25-37).
- **Listener never unsubscribes.** Acceptable for an SPA, mildly untidy under HMR — see Known Issues / q-086.
- **Intro must render before the shell in DOM order.** The sticky-after-scroll mechanism depends on the intro contributing pre-shell scroll height; reordering them breaks the address-bar collapse (engine/components/MobileScrollIntro.tsx:7-16).
- **Orientation uses strict `innerHeight > innerWidth`.** A square viewport counts as landscape and will not trigger `LandscapeGate` (hooks/useMobileLayout.ts:9-10).
- **`isMobileSnapshot()` is safe for `when:` predicates, not for renders.** It reads `useEngineStore.getState()` without subscribing; relying on it inside a component body will produce stale UI on preference / device flips. Use `useMobileLayout()` inside the React tree (hooks/useMobileLayout.ts:45-48, 66-71).
- **The 768px breakpoint is duplicated in HardwareDetection.** `engine/HardwareDetection.ts` (owned by e06-adaptive-resolution) holds an independent copy of the same `matchMedia('(pointer: coarse)') || innerWidth < 768` test. Changing the threshold here means changing it there too — see plans/doc-audit-state/survey/_followups/q-083.md "Related findings" for the cross-subsystem note.

## Interactions with other subsystems

- **e07-plugins-host** owns the `mobileMenu` façade, `MobileMenuHost`, `engine/plugins/Menu.tsx`, `engine/plugins/TopBar.tsx`, and the topbar `when:` mechanism. These are referenced by the historical mobile-layout doc but are out of e12's lane — `TopBarHost` subscribes to `uiModePreference` and `isDeviceMobile` purely so `when:` predicates that call `isMobileSnapshot()` re-evaluate after a preference flip (q-083 confirms the ownership split and q-084 line 19 cites engine/plugins/TopBar.tsx:118 for the subscription).
- **e06-adaptive-resolution** owns `engine/HardwareDetection.ts`, which holds an independent copy of the mobile-detection heuristic (q-083 "Related findings"). Sibling apps that pick a lighter scalability preset on `hardwareProfile.isMobile` at boot are driving that copy, not e12's hook.
- **a01-boot-shell** owns `hooks/useAppStartup.ts`. Any auto-resolution of `uiModePreference='auto'` into a concrete decision at boot happens there, not in this subsystem — see q-001 (referenced by q-083) for the boot/hardware-detect/hydration handshake.
- **GMT app shell** registers `UiModePreferenceMenuItem` against the `'system'` menu (an app-side concern, defined at engine-gmt/topbar.tsx but outside e12's claim list). Sibling apps may expose `uiModePreference` differently; the engine doc owns the store contract, the app owns the UI presentation. See q-084 for the rewording recommendation.
- **GMT app** consumes the primitives. `LandscapeGate` and `MobileScrollIntro` are not auto-mounted by any engine plugin; the GMT app shell mounts them, typically gated on "loading screen finished" (engine/components/LandscapeGate.tsx:5-8, engine/components/MobileScrollIntro.tsx:7-9). GMT-side `MobileControls` (joysticks, mode pill) is a GMT-app concern, not engine code.

## Known issues / Phase 2 carry-in

- **q-083 (drift, answered)** — six items the e12 survey flagged as "outside the audit scope" are actually claimed by sibling subsystems (e07 owns `Menu` / `TopBar` / `mobileMenu` / `MobileMenuHost` / topbar `when:`; e06 owns `HardwareDetection`; a01 owns `useAppStartup`). This module doc cross-links rather than redocumenting (see "Interactions" above). Source: plans/doc-audit-state/phase-2-carry-in.json under `by_subsystem["e12-mobile-layout"]`.
- **q-086 (HMR listener leak, answered)** — `hooks/useMobileLayout.ts:25-37` has no `import.meta.hot` guard. Under Vite HMR each accepting re-evaluation of the module leaks one extra `resize` listener for the rest of the dev session. The inequality guard at hooks/useMobileLayout.ts:30-32 de-dupes the store writes, so functional behaviour stays correct; the leak is bounded to dev sessions and wiped on full reload. Not a production concern. Minimal patch (not currently applied) would be a `window.__gmtMobileResizeInstalled` sentinel or an `import.meta.hot.dispose` cleanup. See the q-086 followup for the full analysis.
- **Outside-tap dismissal not implemented** for `mobileMenu` (historical doc's Known Limitations list). Owned by e07, not e12 — left here as a cross-link only. See plans/doc-audit-state/survey/_docs/d02-engine-docs-2.md line 227 for the preservable note.
- **No followups currently pending against e12.** q-008, q-083, q-084, and q-086 are answered; nothing carrying in besides the q-083 cross-link work captured by this doc.

## Historical context

The original mobile-layout doc lives at docs/engine/17_Mobile_Layout.md (read-only after this audit). Most of its architectural narration is still accurate — sticky-positioning + safe-area-inset, sibling-app adoption checklist, the gating-policy intent — but four claims drifted and are corrected above:

- The hook returns three flags (`{ isPortrait, isDeviceMobile, isMobile }`), not two (hooks/useMobileLayout.ts:66-71 vs docs/engine/17_Mobile_Layout.md:19).
- `MobileScrollIntro` exists and is part of the address-bar collapse mechanism; the historical doc omits it entirely (engine/components/MobileScrollIntro.tsx:1-56 vs docs/engine/17_Mobile_Layout.md:7-15).
- The shell uses `h-[100dvh]` (dynamic viewport), not `h-[100vh]`; the intro pairs `100svh` with the shell's `100dvh` to give the body scroll capacity that retracts the address bar (engine/components/MobileViewportShell.tsx:44-45, engine/components/MobileScrollIntro.tsx:42-45 vs docs/engine/17_Mobile_Layout.md:42-44).
- Adoption-checklist step 1 should render `<MobileScrollIntro>` before wrapping the root in `<MobileViewportShell>` (engine/components/MobileScrollIntro.tsx:7-16 vs docs/engine/17_Mobile_Layout.md:148).

Cross-link only — this module doc captures the shipped surface for the four files in scope; the historical doc remains as the supplementary reference for items in other lanes (mobileMenu / MobileMenuHost / topbar `when:` mechanism / sibling-app adoption checklist / `@engine/environment` future-work placeholder). See docs/engine/17_Mobile_Layout.md for those.
