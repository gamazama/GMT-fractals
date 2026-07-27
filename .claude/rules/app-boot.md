---
paths:
  - "app-gmt/main.tsx"
  - "app-gmt/LoadingScreen.tsx"
  - "hooks/useAppStartup.ts"
  - "store/CompileProgressStore.ts"
  - "engine-gmt/renderer/**"
---

# App boot (app-gmt) — startup, splash, first compile

Read first: JSDoc on `app-gmt/main.tsx`, `hooks/useAppStartup.ts`,
`app-gmt/LoadingScreen.tsx`, `engine-gmt/renderer/GmtRendererTickDriver.tsx`,
`store/CompileProgressStore.ts`.

Decisions: ADRs 0005-0006.

## Frozen-splash debugging

The splash is gated on compile progress reaching the renderer. A frozen splash is
almost always a signal that never arrived, not a timeout that's too short —
trace the actual event chain before touching timings.

## Pre-boot listeners

Environment textures (and anything else that can arrive before the app mounts)
need an early-listener stash + replay. A listener registered after mount misses
the event entirely.

## Guards

```
npm run smoke:boot
npm run smoke:interact
```