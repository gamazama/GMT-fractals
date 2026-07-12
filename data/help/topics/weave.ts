
import { HelpSection } from '../../../types/help';

export const WEAVE_TOPICS: Record<string, HelpSection> = {
    'weave.editor': {
        id: 'weave.editor',
        category: 'Formulas',
        title: 'Weave Editor',
        content: `
A **weave** combines several fractal formulas into one: the formulas take turns across the iteration loop, so each contributes its own character to the final shape. Classic "hybrid" fractals — including most Mandelbulb3D scenes — are weaves.

Open the **Weave** section in the Formula panel. It mirrors whatever formula is loaded — load a woven scene and the section opens ready to edit; press the weave button on a plain formula to start weaving it with others. (A few formulas own their entire iteration loop and can't be woven — the button says so.)

## Building a weave
- **Add formula** opens a searchable picker of every weavable source — built-in GMT formulas, the Mandelbulb3D library, and Fragmentarium/DEC formulas.
- Each formula is a **card**: drag to reorder, set how many **iterations** it runs each turn, remove with ✕.
- **Loop dividers** mark a repeating cycle — everything below the divider repeats.
- **Restore current** brings back the loaded scene's weave; **Clear** starts fresh.
- Leave the name empty and the weave **names itself** after its formula mix.

## Sequence vs Rhythm
Two ways to schedule the same formulas:
- **Sequence** — formulas run as ordered steps: first A for its iterations, then B, and so on, with optional loops and a stop point.
- **Rhythm** — formulas run as overlapping layers, each on its own beat: **start** (which iteration it first fires), **every** (its interval), and **beats** (how many times; 0 = endless). The base formula fills every iteration no layer claims.

Switching modes **converts the pattern** rather than discarding it — the same visual rhythm carries over, now expressed in the other mode's controls. **Live** timing keeps the schedule adjustable with sliders (no recompile); **Baked** compiles it in.

## Build and parameters
Structure edits queue up until you press **Build** ("Build to apply"); **Rebuild** keeps your camera and look while refreshing the fractal. After a build, every woven formula's parameters appear in the Formula panel grouped under its own header — all live sliders, all keyframable, all available as modulation targets, with per-formula randomize.

## Animation follows the formulas
Keyframes and LFOs on weave parameters are bound to their formula, not to a slider position. Reordering or restructuring the weave moves your animation with it automatically — a short report after each Build shows what moved.

## Presets
**Hybrid Box folds** inserts the classic box-fold intro used by many Mandelbulb-family hybrids — it enters as ordinary editable structure, not a black box.
`
    },
};
