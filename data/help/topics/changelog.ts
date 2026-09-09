
import { HelpSection } from '../../../types/help';

/**
 * "What's New" — GMT's user-facing release history, newest first.
 *
 * This is the in-app changelog surfaced from Help → What's New. Entries are
 * normalized to release-notes voice and grouped by version; older entries are
 * condensed from the release announcements (the primary record for GMT's early
 * history is the r/GMT_fractals archive, cross-checked against git history and
 * the docs/releases/ notes).
 *
 * ADDING A NEW RELEASE: prepend a new `## X.Y.Z — <title>` block at the TOP of
 * the content (just under the intro), with a `> <Month DD, YYYY>` date line and
 * a short list of user-facing highlights, then a `---` divider above the prior
 * entry. Source the highlights from `docs/releases/<version>.md` (the
 * going-forward home) and keep them marketing-toned, not implementation detail.
 * Bump the version shown in the About body (`app-gmt/AboutGmtBody`) to match.
 *
 * VERSION BOUNDARIES are taken from package.json bump commits, not Reddit
 * announcement dates (the owner announces cumulatively, so a feature often ships
 * one version before it's posted). If you re-attribute, prefer the git ship date.
 *
 * The page renders through the shared HelpBrowser markdown parser: `##`/`###`
 * headings, `- ` bullets, `**bold**`, `> ` muted asides, `` `code` `` spans, and
 * `---` rules.
 */
// Not exported: app-gmt/HelpExtras.tsx intentionally hardcodes this literal so
// the lazy changelog content never gets pulled into the main bundle.
const CHANGELOG_TOPIC_ID = 'changelog.whats-new';

export const CHANGELOG_TOPICS: Record<string, HelpSection> = {
    [CHANGELOG_TOPIC_ID]: {
        id: CHANGELOG_TOPIC_ID,
        category: "What's New",
        title: 'Version History',
        content: `
Every GMT release, newest first.

## 0.9.8.3 — Repairs, and a new Gradient Explorer
> September 9, 2026

The rest of the codebase audit landing as real fixes — including one that changes how some saved scenes look — plus a rebuilt Gradient Explorer, online as a preview.

**If you use the Modular node graph, read this one.** Five nodes — Scale, Twist, Bend, Smooth Union and Mix — each read one of their own settings twice, which shifted the values of every node placed after them. A Scale in front of a Mandelbulb made the bulb read a power of 0.1 instead of 8, and dragging Power moved the phase instead. Now fixed, which means **saved Modular scenes using those five nodes will render differently**: they read the values their sliders show.

- **Auto Compile is gone from the node graph.** It threw an error when clicked and nothing behind it was ever implemented. COMPILE now lights up only when the graph would actually build a different shader — and deleting a connection or swapping which shape feeds a boolean finally counts as a change.
- **The Formula Workshop imports the formulas it could not read.** For two of the shipped library formulas, Preview and Import did nothing at all — no import, no error. They work now, and you can name the import first.
- **21 shipped formulas are no longer hidden** behind "show broken" on an April snapshot that said they render under neither pipeline. All 21 load today; they are greyed rather than hidden.
- **A crash while drawing the interface shows a page with the error and a Reload button**, instead of a white screen.
- **A shader that fails to compile says so** — a red notice with the actual error, instead of an empty image and no explanation.
- **An export frame that stalls now fails and reports** rather than waiting forever. It gives up only on no progress, so a slow 4K path-traced frame is never cut short.
- **Audio modulation no longer drops a whole ring of onsets** at one exact timing coincidence.
- **One broken overlay can no longer freeze the whole renderer** — the rest of the frame carries on and the failure is named.
- **A saved camera renamed to nothing cancels** instead of storing a blank name.
- **Less of the audio path competes with the renderer for the graphics card.** The interface was repainting sixty times a second with audio running; it is twenty now, and the spectrum display no longer draws on the GPU at all. This is an improvement, not a cure — audio still costs frame rate, and the rest needs proper profiling.

**New: Gradient Explorer v2, in preview** at \`gradient-explorer-next.html\`. A ground-up rebuild — one gradient seen as both palette and stop editor, a browsable wall with "More like this" ranked by how the colours actually look, working faces to Mix · pull from an Image · reshape with Curves · Adjust, a new colour wheel with harmony handles, and a Wallpaper mode whose live frames now render on the graphics card (about 130ms down to under 2ms at 1440p). It is **not linked to GMT yet** and the old Gradient Explorer is untouched.

---

## 0.9.8.2 — Repairs
> September 1, 2026

A maintenance release. Most of it is a codebase-wide audit you will never see, but it turned up real defects along the way — several worth knowing about if you have older scenes, exported meshes, or shared links.

- **Older scenes no longer break the Camera Manager.** Loading a scene saved before late April and opening the panel took the whole app down, losing unsaved work. Those cameras load properly now.
- **Mesh exports were half a voxel off.** Every \`.vdb\` GMT has written was shifted half a cell against its fractal. Re-export anything that needs to line up precisely with other geometry.
- **Share links were dropping Droste settings and the Environment Profile.** Two features were competing for the same slot. Existing links open exactly as before; new ones carry both.
- **Video export used the wrong frame rate when frame step was set.** Rendering every 2nd frame now plays at half rate, as it should.
- **Mirror reflections no longer show hard stair-stepped edges.** Bright highlights on polished curved surfaces broke into 2-pixel steps that never smoothed out however long you accumulated. The grey band down the seam of reflected environment maps is gone too.
- **New: Reflection Filtering** (Engine settings, off by default) calms reflection shimmer while you navigate. It adds about 1.5s to shader compile and changes little in a finished still, so it is opt-in.
- **Restarting an image sequence mid-timeline numbers the files correctly.** Starting at frame 690 saved them from \`00000\`, and a second run could overwrite the first.
- **The sample progress bar shows the right total during a render** instead of counting against the viewport's limit and sitting at 100%.
- **The Audio panel no longer halves your frame rate** when it is open with audio running.
- **Panel and menu animations work again** — they were defined in a file the built app never loaded. Sliders and switches deliberately stay instant.
- **Undo keeps audio clips**, the FPS remap keeps your decks, a crashed export reports instead of hanging, and a blank-named saved camera can be renamed again.

---

## 0.9.8.1 — Audio modulation
> July 25, 2026

- **Musical frequency bands.** Analysis bands are equal width per octave, so the bass gets as many as the treble, and bands are picked in real Hz rather than as a share of the spectrum. **Tilt** lifts the highs to offset music's natural roll-off.
- **Transient mode** fires a link on each hit instead of following loudness, and ignores notes merely sliding in pitch — vibrato and filter sweeps no longer read as continuous hits.
- **Live input** gained a device picker for mic, line-in and system audio, an input trim and a level meter. Chrome's echo cancellation, noise suppression and auto-gain are now switched off; they were ducking and notching desk feeds.
- **Auto Gain** keeps one set of thresholds working across tracks.
- **Analysis moved to the audio thread**, so it keeps running while the interface is busy compiling or loading. About 40% less lag, and response no longer varies with frame rate.
- **Scenes restore their audio links** when loaded, while the input stays connected.
- **Modulation recording** captures every frame, instead of holding one value through busy stretches.
- **Rotation, camera and lighting** now modulate live, and curved parameters respond evenly across their range.
- Audio panel reorganised around the spectrum and the links.

---

## 0.9.8 — Weave & Mandelbulb3D
> July 12, 2026

- **Weave** — the headline feature. Stack any formulas into a single fractal — built-in GMT formulas, Fragmentarium/DEC formulas, and imported Mandelbulb3D formulas, mixed freely. Two timing modes (**Sequence** and **Rhythm**), and every woven formula keeps its own live, animatable sliders.
- **Mandelbulb3D import** — load classic \`.m3p\` scenes, including hybrids, plus a picker catalog of 180 converted formulas and 38 ready-to-load sample scenes. The ray marcher now steps the way Mandelbulb3D does, so imports match the source — and native scenes gained crisper surface detail from the same change.
- **Sky, fog & background overhaul** — one Background & Sky section for solid colors, gradients, images and HDR environments, with a Sky Library of bundled HDRs. Fog now takes its color from the sky.
- **True multi-bounce reflections** — accurate colors, fog along reflected rays, and far less noise.
- **Shadows at depth** — shadows no longer silently fade out on deep zooms.
- **Share a scene by link** — free, no sign-in: any scene behind a short link that opens straight into the editor.
- **New genuinely-3D formulas** — Julia3DKucera and Julia3DZorich, from the 3D quadratic Julia/Mandelbrot research program.
- Timeline, workflow and UI-consistency polish throughout — one color picker, one slider system, and an interface theme composed from brightness / tint / contrast.

---

## 0.9.7 — The engine goes live
> June 17, 2026

- **The rebuilt engine is now the production app** — GMT runs entirely on the new reusable core, so fixes and features land faster and more consistently.
- **Quality tiers in the viewport** — set path-tracer, shadow and reflection quality from one dropdown (with an estimated compile time), plus a single **UI Responsiveness** control for how hard the GPU works while you interact.
- **Runtime color themes** — dark, light and high-contrast, with brightness, surface-tint and accent-hue sliders. No reload.
- **A floating Settings panel** — Interface, Files and Hardware tabs, reachable from anywhere.
- **Modify & Convert with AI** — export a formula as a ready-made prompt for your favourite LLM and paste the result straight back, with error repair; Convert rewrites an imported self-contained formula into native GMT.
- **FBX camera-rig export** — send your animated camera, lights and parameters to Cinema 4D, Blender or Fusion.
- **Aim lights by dragging** them in the viewport, and tear panels off to float freely — all undoable.
- **Click the FPS counter** to switch it to a samples-per-second readout.
- **On-screen diagnostics** — a \`?diag\` overlay and a friendly WebGL error screen (with a send-report button) when a device can't boot the renderer.

---

## 0.9.6 — Rebuilt on a new engine
> June 1, 2026

- **GMT was rebuilt on a generic, reusable engine** — the same core now powers GMT, the Gradient tool and Fluid Toy, so improvements and fixes flow to every app at once. Mostly an under-the-hood rebuild, with a few visible wins:
- **Smoother, more responsive rendering** — the fractal refines progressively, band by band, while the UI stays live.
- **Deeper minibrot dives** — a new nucleus-reference path uses exact periodic orbits so deep zooms into minibrots stay sharp and stable, alongside a reworked deep-zoom coloring engine.
- **Favients** — a gradient **favourites shelf**: save, group and reorder the gradients you love in a dedicated panel, kept in sync across GMT.
- **Export to After Effects** — a *Save AFX comp* option builds a ready-to-composite AE composition from your camera, lights and animated parameters.

---

## 0.9.5 — Gallery, unified picker & feedback
> May 24, 2026

- **User creations gallery** — browse and load other users' scenes, and submit your own, with high-res image links; works with custom Workshop formulas and sky maps.
- **A unified formula picker** — six categories with thumbnails, type-to-search, grid/list views and full keyboard navigation, with the online gallery built right in.
- **Send Feedback** in the Help menu — the bug reports and requests that shape the road to 1.0.
- **New formula: Sine Julia 3D** — Kleinian-like limit-set forms from a 3D sine map.
- Saved cameras round-trip cleanly, UI preferences persist across reloads, and bucket render gains more sizes and an embedded-metadata toggle.

---

## 0.9.4 — Area lights, mobile & the audio timeline
> May 3, 2026

- **True area lights** — the path tracer now supports real sphere lights that reflect and cast physically soft shadows, and converge about twice as fast.
- **Mobile mode** — GMT is genuinely usable on phones and tablets, with better performance and a touch-friendly UI.
- **Audio in the timeline** — a rebuilt canvas timeline that stays smooth with thousands of keyframes, audio in video exports, and modulation recording over long durations.
- **Performance** — volumetric god-rays about 60% faster while you interact, plus a broad polish pass (log-scale Repeats, a custom viewport aspect-ratio dialog, and more).
- One consolidated **File menu**, JPG export, and paint/erase brushes plus a Post-FX panel in Fluid Toy.

---

## 0.9.3 — Cursor-anchored navigation & deterministic playback
> April 27, 2026

- **Orbit and zoom around your cursor** — the view now pivots on the point under the mouse instead of the screen center (toggle the DST HUD for the old behaviour).
- **Deterministic playback** — the live preview plays at your project's frame rate, so it matches the exported video frame-for-frame.
- **FPS Keep / Match modes** — change the project frame rate and either keep keyframes on their frames or rescale the whole animation to the same wall-clock timing.
- **Per-scope undo** — camera moves and parameter edits undo on separate stacks, so Ctrl+Z rolls back what you actually just did.

---

## 0.9.2 — Desktop app, camera slots & the Modular Builder
> April 2026

- **Install GMT as a desktop app** (PWA) — precache the whole app and run it offline.
- **Camera slots** — \`Ctrl+1–9\` to save a view, \`1–9\` to recall it.
- **Modular Graph Builder** — assemble fractals from nodes (first round).
- **New Kleinian formulas** and a smarter Formula Workshop — 490 tested formulas, each tagged Iteration or Standalone.
- **GMT gets its own website**, plus unlimited tiled hi-res rendering, a full-resolution 1:1 preview region, and multi-pass (beauty / alpha / depth) video and image-sequence export.

---

## 0.9.1 — New solids, Formula Interlace & mesh export
> April 8, 2026

- **A wave of new formulas** — Platonic solids (Octahedron, Icosahedron, Cuboctahedron, Truncated Icosahedron), Catalan duals, Coxeter, Apollonian and PseudoKleinian.
- **Formula Interlace** — blend two formulas by alternating their iteration steps, in both the renderer and mesh export.
- **An experimental mesh exporter** — VDB output with optional colour grids, plus GLB/STL for preview and camera presets in the preview view.
- **Adaptive resolution on by default**, a contextual tutorial-hints system, and a Support link for the project.

---

## 0.9.0 — Formula Library & the .gmf scene format
> March 21, 2026

- **Formula Library** — browse and search 100+ Fragmentarium and 300+ DEC formulas by author and category, backed by a completely rewritten Workshop.
- **The \`.gmf\` scene format** — one file captures formula, camera, lighting, features and animation; PNG snapshots embed their formula too, and older JSON/PNG presets still load.
- **Light gizmos and light duplication**, vec4 parameter support, and a smarter bucket renderer with a live region-stats overlay.

---

## 0.8.9 — A multithreaded engine & the Formula Workshop
> March 13, 2026

- **The render engine moved to a second thread** — the UI no longer stalls while compiling, and on Chrome/Edge you get a preview shader to play with while the full one builds.
- **The Formula Workshop** — import Fragmentarium formulas, write your own, and map their variables straight onto GMT's sliders.
- **Vec controls** — 3-in-1 xy/zy drag-pads with a rotation mode, a units toggle and double-click reset — plus Hybrid-Box variants, clearer volumetric scattering, and a step-jitter control that smooths slicing artifacts like butter.

---

## 0.8.6 — Faster, smoother, and a permanent home
> February 2026

- **Blazing fast, no extra compilation** — a big responsiveness pass that made the whole app feel smooth.
- **A permanent URL** for the app.
- And a brand-new fractal — the **MandelBolic**.

---

## 0.8.2 — GMT goes public
> January 7, 2026

- The first public build of the **GPU Mandelbulb Tracer** — real-time 3D fractals, right in the browser — and the start of the r/GMT_fractals community.
`,
    },
};
