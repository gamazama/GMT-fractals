---
paths:
  - "engine-gmt/utils/FormulaFormat.ts"
  - "utils/SceneFormat.ts"
  - "utils/UrlStateEncoder.ts"
  - "utils/Sharing.ts"
  - "engine-gmt/features/fragmentarium_import/**"
---

# GMF save/load, scene serialisation, Formula Workshop

Read first: JSDoc on `engine-gmt/utils/FormulaFormat.ts` and `utils/SceneFormat.ts`;
JSDoc on `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` (the V3/V4
importer and the `importSource` lifecycle).

Decisions: ADRs 0052-0053 (save/load), ADR-0058 (Formula Workshop).

## Migrations are the risk

Every field added to a scene has to survive a round-trip from an older file.
Adding a field without a migration means old scenes silently lose it. The migration
chain is versioned — append to it, don't renumber.

`?s=<id>` share-by-link round-trips through backend GMF, so a format change affects
shared links too, not just local saves.

## Guards

```
npm run test:gmf
npm run test:migrations
npm run smoke:migrations
npm run test:frag
npm run test:frag:integration
npm run test:frag:catalog-drift   # node-only, ~10 s: no catalog `pass` row errors under its pipeline today
npm run test:share-dictionary   # node-only, ~1 s: the share dictionary and a full-slice round-trip
npm run smoke:share-link
npm run smoke:gallery-link
```

**Two of these were not real gates until 2026-07-28.** `test:frag` printed
`N failed` and then exited 0, so nothing that read its exit code could ever see a
regression; it now exits 1 on failure. `test:frag:integration` passed `--discover`
and swept the whole ~580-file `reference/Examples` tree, sitting permanently at
236 passed / 307 failed / exit 1 — a guard that has never been green cannot
distinguish a regression from its own baseline. It now runs the curated
registered matrix and is green.

**The full sweep still exists as `npm run test:frag:integration:discover`, and it
is worth running by hand.** It is diagnostic-only and permanently red — but of
its 307 failures, 289 are by-design rejections (Fragmentarium raytracer headers,
`Progressive2D` 2D shaders, DE-less brute-raytracer files) and **18 are standalone
3D fractals with a real `float DE(vec3)` body that fail on GLSL parse errors** —
unsupported `samplerCube`/texture uniform syntax, plus at least two parser
null-derefs (`Benesi/MengersmoothPolyhedra.frag`,
`Kashaders/With_CRrenderer/Simple_Kleinian-Slow-DE-02----l.frag`). Those 18 are a
genuine importer gap, not noise. Nothing gates on them, so run the sweep before
you conclude the importer handles a given family of formulas.

`npm run test:frag:v` is the **same script** as `test:frag` with `--verbose`,
which gates exactly one `console.log` of the generated GLSL — same 60-formula
matrix, same counters, same exit contract, inherited rather than reimplemented
because it is one file. Re-falsified 2026-08-02: forcing V3 detect to reject
every formula (grep `No DE function detected`) gives 0 passed / 60 failed,
exit 1, and repointing `REF` at a directory that does not exist gives exit 1 on
both the `missing` and empty-matrix gates. It adds nothing as a second CI entry
and everything when `test:frag` goes red — it prints the generated function for
the formula that failed.

`npm run smoke:gallery-link` was repaired the same day, and its old blind spot
is the one to remember when reading a green run here: the block headed "the
shared scene is live in the editor" was satisfied by app-gmt's own boot state.
The editor and the fixture GMF are both Mandelbulb, and "iterations is a
number" is true of the default 16 — so deleting the terminal
`loadScene({ preset })` from `engine-gmt/gallery/loadGalleryScene.ts` left the
whole smoke at exit 0 with its PASSED banner. It now snapshots the store before
the remix and pins `coreMath.iterations` to the value the GMF declares. It
still **skips at exit 0** on a build with no `VITE_SUPABASE_*`, deliberately —
so a green run on a fresh checkout proves nothing about this path at all.

`report:frag:scan` (named `test:frag:scan` until 2026-09-02) is **a report, not a guard** — it has no assertion on
its own results, so it prints its failures and exits 0 regardless. Do not cite it
as passing evidence. **Confirmed by falsification 2026-07-29**: forcing
`hasDE = false` in `engine-gmt/features/fragmentarium_import/v3/compat.ts`, so V3
detect rejects every formula in the library, moved its counts from 2 / 42 / 2 to
156 / 0 / 44 and still exited 0. Total importer breakage is invisible to it.

It does now exit 1 on **one** thing, added the same day: finding zero `.frag`
files. Its `walk()` swallows a missing directory, so pointing `PUB_DIR` at a path
that does not exist used to print "Scanning 0 frags", three zero counts and
exit 0 — a vacuous report indistinguishable from a clean one (the same defect
batch 3 found in `test:frag`). Baseline is 200 files, so the gate costs nothing.
Its failure counts are still ungated; see PROPOSALS.md for the `both fail` gate,
which has a nameable baseline of two `#donotrun` library files.