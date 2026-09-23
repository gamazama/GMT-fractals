---
source: gradient-explorer/v2/main.tsx
last_verified_sha: 39f2e74b41f21bc95dda466f79f77d37a18550b0
additional_sources:
  - gradient-explorer/v2/registerFeatures.ts
  - gradient-explorer/v2/GradientExplorerV2App.tsx
  - gradient-explorer/v2/shareUrl.ts
  - gradient-explorer/FullscreenGradientOverlay.tsx
  - gradient-explorer/PickerStage.tsx
audited: 2026-09-16T00:00:00Z
audited_by: claude-opus-5
public_api: []
depends_on:
  - p01-palette-suite
---

# gradient-explorer — overview

Standalone sibling app: the **GMT Gradient Explorer** — find, make and export colour
gradients. The domain (catalogue, pipeline, favourites, export formats) lives in the
host-agnostic [`palette/`](../palette/palette-suite.md) suite; this folder is the shell that
lays it out, plus the fullscreen Wallpaper surface.

This page is a map, not a description: every file named below carries its own top-of-file
JSDoc, and that is the authority. Read the code.

## Entry points

| Page | Loads | Why it exists |
|---|---|---|
| `gradient-explorer.html` | `gradient-explorer/v2/main.tsx` | The canonical page. GMT (`openGradientExplorer` in `palette/installFavients.ts`, with `?from=gmt`) and fluid-toy (`fluid-toy/registerFeatures.ts`) open it. |
| `gradient-explorer-next.html` | the same module | An **alias** for links shared while v2 was in preview (`?g=…` share links, GMT's 0.9.8.3 changelog). Keep its markup identical to the canonical page — `npm run test:gx-share` [4] fails when the two drift. `shareUrlFor` writes new links on the canonical page. |

Both are `build.rollupOptions.input` entries in `vite.config.ts`.

**The first shell is gone** (retired at the entry-point swap, 2026-09-16: `GradientExplorerApp`,
its `main.tsx` / `setup.ts` / `registerFeatures.ts`, the drop dock and the generator stage).
`git log --diff-filter=D -- gradient-explorer/` finds it. The files below lived beside it and
outlived it — app-gmt mounts one, v2 mounts the rest.

## Where to start

| If you're touching... | Read |
|---|---|
| Boot order, which engine plugins load and why | JSDoc + body of `gradient-explorer/v2/main.tsx` |
| Registration before the store freezes | `gradient-explorer/v2/registerFeatures.ts` |
| The shell's layout, the top bar, source switching | `gradient-explorer/v2/GradientExplorerV2App.tsx` |
| The hero (the stops editor) and the tray faces | `v2/WorkingHero.tsx`, `v2/Tray.tsx`, `v2/SourceBands.tsx` |
| The wall, the set rail, the ground | `v2/BrowseStage.tsx`, `v2/SetRail.tsx`, `v2/useGroundSource.ts`, `v2/GroundList.tsx` |
| Share links, "Back to GMT" | `v2/shareUrl.ts` |
| Export, session save / autosave | `v2/ExportMenu.tsx`, `v2/exportActions.ts`, `v2/session.ts` |
| Help, About, What's New, the version | `v2/help/`, `v2/ShellMenu.tsx`, `v2/version.ts` |
| Phone layout | `v2/useIsPhone.ts` and ADR-0115 |
| Wallpaper (fullscreen modes, export at size, handles) | `FullscreenGradientOverlay.tsx`, `fullscreen/modeRegistry.ts` |
| The palette domain itself | [palette-suite.md](../palette/palette-suite.md) |

## Outside `v2/` but live

- `PickerStage.tsx` — mounted by app-gmt's `PalettePickerOverlay`.
- `FullscreenGradientOverlay.tsx` + `fullscreen/**` — the Wallpaper surface. The overlay
  follows whatever live source the host registers (`setFullscreenLiveSource`); with none it
  shows the open-time snapshot.
- `fractalHandoff.ts` — the Fractal wallpaper's hand-off into fluid-toy.

## Guards

The per-app guard list lives in `.claude/rules/sibling-apps.md` (the `gradient-explorer/` row).
