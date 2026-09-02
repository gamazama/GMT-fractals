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
npm run smoke:engine-gmt   # app-gmt.html — asserts isBooted + hasCompiledShader + frameCount > 0
npm run smoke:compile-failed  # app-gmt.html — a broken formula puts CompileProgressStore in
                              # `failed`, the indicator shows it, proxy.lastCompileFailed is set,
                              # and a good compile clears both
npm run smoke:boot         # `/` — index.html serves app-gmt/main.tsx; pageerror/console.error gate only
```

`smoke:engine-gmt` is the real guard for this rule: it is the only one that
asserts the app-gmt boot chain actually completed. `smoke:boot` covers the same
entry point (`/` and `/app-gmt.html` serve the identical app) but only gates on
page/console errors.

Do NOT reach for `smoke:interact` here — it targets `demo.html` → `index.tsx`,
the engine demo shell, whose import graph contains no `app-gmt/**` or
`engine-gmt/renderer/**` file. It cannot fail on a change to this rule's paths.