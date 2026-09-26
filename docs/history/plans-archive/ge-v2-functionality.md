# Gradient Explorer — functionality inventory (2026-09-06)

One line per capability. What the app can DO, independent of where it currently sits on
screen — written for a fresh design pass. (v2 shell on `ge-v2`; items marked *old shell
only* exist today only in `gradient-explorer.html`.)

## 1. Find a gradient (Browse)
- Wall of ~3,000 catalog gradients, drawn as swatches, zoomable (drag-zoom, right-drag pan, Fit).
- Search by name / source / theme.
- Filters: hue chips · look sliders (lightness, chroma, contrast…) · source bundles · a count badge.
- Arrange: group by / rows by / sort by any axis (theme, lightness, hue…), reverse — read back as a sentence.
- Narrow by gesture: Box, Lasso, Paint → keep or cut the selection (carve the wall down).
- More like this: sort the wall by similarity to the current gradient.
- Hover preview (enlarged swatch); click = preview in the hero; click again = keep.
- Drag a wall swatch into My Gradients.

## 2. Make a gradient
- **Mix (two sources):** A and B slots, filled from the hero, the bin or the wall; crossfade A→B; per-channel split (lightness / chroma / hue separately); Swap; Reset.
- **Image:** drop / paste an image anywhere; three methods — Dominant (saliency colours → ramp), Tones (the image's colour per brightness), Path (drag a line across the image); method dials (count, smoothing, etc.); a dominant-swatch row.
- **Sweep** *(old shell only)*: per-channel start → end under an easing curve (ColorBox).
- **Stops from scratch** *(old shell only as a mode; in v2 any gradient becomes stops on edit)*.

## 3. Edit the working gradient (the hero)
- The stops editor: drag knots, click the ramp to add, delete, multi-select (shift / marquee / double-click all), bracket-drag a selection (move / scale), duplicate.
- Per-stop colour picker (field + hue, RGB/HSV/OKLCh channels, hex, eyedropper, harmony rows, recents, the working palette as a swatch row).
- Interpolation per stop or per selection: Smooth / Linear / Step (right-click menu). Bias handles on segments.
- Blend space: RGB / HSV / HSV Far / Oklab. Output profile: sRGB / Linear / ACES.
- Stops menu: copy / paste stops, reverse, distribute, flip, send to My Gradients.
- **Palette face:** N swatches sampled from the ramp; Even / Perceptual / Stops layouts; drag a swatch along the ramp (handover past a neighbour); + at the largest gap; × per swatch; click = select / create its stop; hex on hover.
- **Curves:** fit L / C / h curves from the source (Detail, Smooth), edit the curves on a graph (points, tangents, per-channel), on / off, reset, re-fit; ghost preview of a re-fit.
- **Adjust:** hue rotate · chroma × · contrast · posterize bands · repeats · phase · mirror · reverse · noise amount / frequency / target channel.
- Source over result: while any of the above is live the hero shows the source band(s) above the result; bake folds them; "return to source" unfolds.
- Name the gradient. Undo / redo across everything (Ctrl+Z / Ctrl+Y).

## 4. Keep and organise (My Gradients)
- Recent fills itself: one entry per working session, updated as you edit; a re-picked entry forks on first change; capped at 60.
- Star = keep (a user-filed copy). Named groups; drag to reorder, between groups, into a new group, to the trash.
- Full panel: search / filter, grid or list view, rename gradients and groups, collection import / export (.json), per-format export of the whole shelf (one file or a zip), contact sheet PNG.
- Shared with app-gmt and fluid-toy (same local collection). Built-in Presets group as a starter set.
- Bin click = preview / keep, or fill a Mix slot when one is armed.

## 5. Snapshots and comparison (Variants)
- Capture the whole studio state as a variant (A/B/C/D…); switch; update; rename; duplicate; delete.
- Tween between two variants (OKLab), bake the tween as the working gradient.

## 6. Output
- **Share:** a link that opens the gradient (stops in the URL).
- **Export (single gradient):** CSS · SVG · hex list · JSON · JS array · Photoshop .grd · Illustrator .ai · InDesign .idml · GIMP .gpl / .ggr · Paint.NET · Fractint .map · .cpt · Ultra Fractal .ugr · CSV · Python; Copy or Download; PNG strip. (Planned: .ase, Tailwind, design tokens.)
- **Wallpaper (full-screen render):** geometry modes Linear / Radial / Conic / Arch with their dials (angle, centre, scale, bias, mirror, span, curvature…); Fractal (the gradient colouring a fractal); Liquify (soft-body distortion you drag); Parallax (layered drift); Spline; Gradient map (recolour the dropped image by luma, strength, invert). Export at size: Phone / Square / 1080p / 4K / Custom, portrait / landscape, dither, supersample ×2, PNG.
- Send the gradient to the main GMT studio / other apps *(old shell + app-gmt: send-target dock)*.

## 7. Shell
- Three sources as tabs (Browse · Mix · Image); the hero always on top; the bin always at the bottom.
- Settings: colour theme (Dark / Grey / Light Grey / Light + axes), UI scale and the engine's core settings.
- Keyboard: Esc (cancel armed slot / close), Delete (stops), arrows (nudge stops), [ ] (paint size), Ctrl+Z/Y.
- Save / load a scene file and the old dock/timeline *(old shell only; v2 dropped the timeline and Animate on purpose)*.
