---
paths:
  - "hooks/useMobileLayout.ts"
  - "engine/components/LandscapeGate.tsx"
  - "engine/components/MobileScrollIntro.tsx"
  - "engine/components/MobileViewportShell.tsx"
  - "engine/HardwareDetection.ts"
  - "palette/store/favientsPanelPersist.ts"
---

# Mobile layout

Read first: JSDoc on `hooks/useMobileLayout.ts` and
`engine/components/{Landscape,Mobile}*` — address-bar collapse and the layout
primitives. `engine/HardwareDetection.ts` owns the detection primitive itself.

Decisions: ADRs 0038-0039.

## Watch out

- **The 768px / `(pointer: coarse)` breakpoint is NOT single-sourced yet,
  whatever `isMobileViewport()`'s neighbours imply.** `isMobileViewport()` in
  `engine/HardwareDetection.ts` is the intended home and has exactly two
  importers (`hooks/useMobileLayout.ts`, `detectHardwareProfile`). Eight
  inline re-implementations of the same test survive — in `store/slices/
  uiSlice.ts` (x2), `store/slices/viewportSlice.ts`, `components/layout/
  Dock.tsx`, `engine-gmt/renderer/GmtRendererCanvas.tsx`, `engine-gmt/
  components/FormulaPicker/FormulaPicker.tsx` (x2) and `palette/store/
  favientsPanelPersist.ts`. The full list with roles is in
  `isMobileViewport()`'s JSDoc. The one that bites hardest is the **uiSlice
  slice initializer**, which seeds `isDeviceMobile` at store construction:
  changing the threshold in `HardwareDetection.ts` alone leaves the boot value
  on the old threshold until the first resize event. Verified by mutation —
  set the threshold to 2000, boot at 1400x900, and `isDeviceMobile` is still
  `false`.
  (`gradient-explorer`'s `MOBILE_BREAKPOINT` is deliberately not one of these:
  width-only layout-fit threshold, not device detection. Leave it.)
- **Asymmetric gating is load-bearing (ADR-0038).** `LandscapeGate`,
  `MobileScrollIntro` and `MobileViewportShell` consume raw `isDeviceMobile`;
  joysticks / mobile menu / hidden chrome consume preference-aware `isMobile`.
  Collapsing the two silently breaks Force-Mobile-on-desktop (a `100svh` banner
  deadlocks a desktop body that is `overflow: hidden`).
- `detectHardwareProfile(gl)` is NOT cached, and is not once-per-session either
  — three call sites, one of them a user-clicked "reset to detected" button in
  `HardwarePreferences`. The FBO-allocating path only runs when a GL context is
  passed, and no in-tree caller passes one today.
- `MobileViewportShell` has a fixed-position stacking trap — a fixed ancestor
  creates a containing block that in-flow z-index can't escape. See the layers rule.
- Mobile float-format support differs from desktop. The `?diag` query param is the
  workflow for diagnosing device-specific render failures.

## Guards

**There is no automated guard for mobile layout.** `smoke:viewport` (adaptive
quality chain) and `smoke:viewport-fixed` (ViewportFrame content-box) were
previously listed here, but both boot at a 1400x900 desktop context and assert
nothing about mobile detection or the layout primitives — verified by breaking
the 768px threshold and watching both stay green. Use them as generic
no-regression cover only:

```
npm run typecheck
npm run smoke:boot
```

Real coverage is manual, on a device or via a mobile-emulated Playwright
context. A promotable probe (boots at a `devices['Pixel 5']` context and checks
`isDeviceMobile` / `isPortrait` / the shell's `sticky` vs `fixed` branch, then
crosses the breakpoint by resize) is sketched in the e12 audit report.
