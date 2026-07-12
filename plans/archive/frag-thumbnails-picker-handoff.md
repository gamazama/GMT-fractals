# Handoff — Incorporate Frag/DEC Thumbnails into the Formula Picker

**Status:** Not started. Hand-off written 2026-06-01.
**Prereq context produced this session:** 484 frag/DEC thumbnails rendered + triaged; Formula Workshop bugs fixed; render tooling built. See "Discovery order" below.

## The task (user's words)
"optimizing and incorporating the FW thumbnails into the formula picker" — i.e. the Workshop catalog (511 frag/DEC formulas, 490 renderable) currently has **no thumbnails** in its browse UI; we now have rendered thumbnails for ~443 of them. Surface them, and make the picker/browse efficient about it.

## Discovery order (read these first, in order)
1. **`plans/formula-picker-design.md`** — the locked picker design (implemented 2026-05-26). NOTE its scope explicitly EXCLUDES the Workshop catalog ("the 360+ frag/DEC fixtures stay inside Workshop's existing `CategoryPickerMenu`") and assumes native thumbnails only. This task extends beyond that doc.
2. **Memory `project_frag_gallery_render.md`** — how the 484 thumbnails were produced + where they live + the triage buckets.
3. **Memory `project_formula_workshop_fixes.md`** — the 3 Workshop bugs fixed this session (don't re-break them).
4. **`debug/scratch/frag-gallery/_report/report.md`** + `report.json` — the triage: works 368 / needsLight 70 / flat 46 / failed 6. `report.json` is machine-readable (buckets of ids).
5. Source: `engine-gmt/components/FormulaPicker/` (picker), `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` (the catalog browser: `browseFragOpen`/`browseDECOpen`, `CategoryPickerMenu`), `engine-gmt/components/panels/formula/FormulaGallery.tsx` (`LazyThumbnail` IntersectionObserver pattern to reuse).

## What exists to build on
- **Thumbnails (gitignored scratch):** `debug/scratch/frag-gallery/<safeId>.png` (raw) and `debug/scratch/frag-gallery-levels/<safeId>.png` (auto-leveled, punchier — prefer these). `safeId = id.replace(/[^a-zA-Z0-9_.-]/g,'_')`. 484 files + 8 contact sheets + `index.html`.
- **Native thumbnails (the committed convention):** `public/thumbnails/fractal_<Name>.jpg`, git-tracked, 42 of them. Loaded by the existing picker. A frag thumbnail home would mirror this (e.g. `public/thumbnails/frag/<safeId>.jpg`).
- **Catalog:** `public/formulas/v3-v4-catalog.json` (`byId[id].recommended = v3|v4|none`). The picker/browse can use `recommended !== 'none'` to filter and the thumbnail presence to decorate.
- **Regen tooling (all default to `debug/scratch/`):** `debug/frag-gallery.mts` (render), `frag-retry-singlecolor.mts` (headlight retry), `frag-autolevels.mts`, `frag-contact-sheet.mts`, `frag-report.mts`. See `project_frag_gallery_render.md` for flags.

## Key decisions the new session must make
1. **Which thumbnails to COMMIT, and where.** 155MB raw is too heavy for git. Options: commit a curated, downsized subset (e.g. the 368 "works" + 70 "needsLight", as small JPEGs under `public/thumbnails/frag/`), or load on demand. The 46 flat + 6 failed should NOT get committed thumbnails (they're blank/broken — fix first via the fix-queue, see below).
2. **Optimize/downsize.** Current PNGs are 288px. Picker uses 64×64 default. Downsize to ~96–128px JPEG (q~0.85) before committing — big size win. `frag-autolevels.mts` runs in a headless browser canvas already; a downsize+JPEG re-encode pass is a small extension of it.
3. **Wire into the catalog browser** (`FormulaWorkshop` `CategoryPickerMenu` / browse grids), reusing `LazyThumbnail` (IntersectionObserver) so 490 thumbs don't all decode at once. The unified `FormulaPicker` (per its design doc) deliberately does NOT browse the catalog — confirm with the user whether catalog thumbs go in the Workshop browser, the unified picker, or both.

## Gotchas (learned this session)
- `nonBlackFraction:1` from the render harness means "no black pixels" — usually the camera is INSIDE the object, NOT success. Frame via orbit camera pulled back (`debug/opus-cam.ts` → rename pending to `orbit-cam.ts`).
- Detection auto-collapses the Workshop source editor; UI smokes must expand "Source Code" first. Two `.cm-content` editors exist (source, then read-only transformed-output).
- Background commands: use the BARE command + `run_in_background:true` (NO `nohup`/`&`) or completion never reports.
- `window.__store` (app-gmt) exposes `getState().openWorkshop/closeWorkshop` for headless UI smokes.

## Related open work (not this task, but adjacent)
- **Fix-queue:** `debug/scratch/frag-gallery/_report/fix-queue.html` — 46 flat + 6 failed formulas with thumbnails, for a camera/light/pipeline fix pass, then re-render via `frag-gallery.mts --ids=...`.
- **Clean dev merge:** branch off `dev` (tip `f7b565e`), rename `debug/opus-cam.ts`→`orbit-cam.ts` (frag tooling imports `orbitCamera`), bring the frag tooling + the 3 FW fixes; NO Opus formula, NO app-gmt/engine-core changes.

## This session's FW fixes to preserve (all verified, uncommitted)
1. `parsers/dec-detector.ts` + `v4/ingest/index.ts` — promotion no longer breaks DEC formulas.
2. `FormulaWorkshop.tsx` — module-scoped draft restores in-session state on reopen.
3. `v3/analyze/params.ts` — angle-named uniforms only show π/degrees when the range is a real degrees range (≥180 span or straddles ±90); radian constants / normalized components stay linear.
4. `parsers/angle-detection.ts` (new) — shared `looksLikeDegreesRange`, used by V3 + V4 (from a /simplify pass).
Regression/smoke tests: `debug/test-promote-full.mts`, `debug/test-promote-regression.mts`, `debug/smoke-workshop-state.mts`.

Deferred to `/code-review` (found by /simplify, NOT behaviour-safe to auto-fix): the annotation-uniform regex `uniform…;(slider|checkbox|color|file)[` is hand-written in ~3 sites with subtle shape differences; and V3↔V4 angle NAME-lists have drifted (`phi`/`roll` vs `heading`/`tilt`, `rot` substring vs guarded regex) so the same formula can get a different π/degrees slider depending on which pipeline the catalog picks.

---

## Kickoff prompt for the new session (paste this)

> Continue GMT Formula Workshop work in `h:/GMT/workspace-gmt/dev` (run commands from there). Task: **optimize + incorporate the frag/DEC thumbnails into the formula picker.** Start by reading, in order: this file (`plans/frag-thumbnails-picker-handoff.md`), then memory `project_frag_gallery_render.md` and `project_formula_workshop_fixes.md`, then `plans/formula-picker-design.md` (note it predates the thumbnails and excludes the catalog), then `debug/scratch/frag-gallery/_report/report.md`. Then inspect `engine-gmt/components/FormulaPicker/`, `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` (catalog browser), and `engine-gmt/components/panels/formula/FormulaGallery.tsx` (`LazyThumbnail`). 484 rendered thumbnails live in `debug/scratch/frag-gallery-levels/<safeId>.png` (gitignored, 288px). Before building, confirm with me: (a) which thumbnails to commit and where (likely a downsized JPEG subset under `public/thumbnails/frag/`, mirroring native `public/thumbnails/fractal_<Name>.jpg`), and (b) which surface gets them — the Workshop catalog browser, the unified FormulaPicker, or both. Don't auto-run multi-agent workflows; ask first. Preserve the 4 uncommitted FW fixes listed in the handoff (don't revert them). Background commands: bare command + `run_in_background:true`, never `nohup`/`&`.
