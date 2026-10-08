# ADR-0133: Navigation emits displacements; it never reads a position back

- **Status:** Accepted
- **Date:** 2026-10-08
- **Relates to:** ADR-0061 (interaction sessions - untouched here). Code:
  `engine/plugins/navigation/FlyIntegrator.ts` (grep `settings.translate`, `FLY_DEFAULT_MIN_SPEED`,
  `FLY_DEFAULT_BOOST_MIN_DISTANCE`), `engine/plugins/navigation/modifiers.ts`,
  `engine-gmt/engine/controllers/CameraController.ts` (the re-export GMT imports),
  `engine-gmt/navigation/Navigation.tsx` (grep `emitOffsetShift`, `flyController.current.update`).
  Guards: `npm run test:nav-replay`, `npm run smoke:fly`. Plan: `plans/deep-zoom-shell/GMT-SYSTEMS.md`
  section 3 and `BUILD-PLAN.md` stage N.
- **Numbering:** 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

> **Update 2026-10-08 (the input hook followed; decision unchanged):** the keys / wheel / drag
> hook is now `engine/plugins/navigation/useNavigationInput.ts`, renderer-free and store-free, with
> `engine-gmt/navigation/useInputController.ts` as GMT's wrapper. The third consequence below
> ("still unguarded in GMT") is narrowed: `npm run smoke:fly` now drives strafe, vertical, boost,
> the wheel's speed, a text field, drag-look and the interaction session through the real
> handlers, each line seen red. Roll, Alt, the sticks, invert-Y and the orthographic wheel remain
> unopened by any test.

## Context

The owner decided (2026-10-08, DECISIONS K4 in `plans/deep-zoom-shell/`) that the deep-zoom shell
flies with GMT's own navigation, "reworked generically - no private copies". The two renderers
hold a camera position in ways that cannot be reconciled as numbers: GMT keeps a virtual-space
offset (a pair of doubles per axis) and treadmills the three.js camera at the origin; the deep
renderer keeps three 256-bit fixed-point integers, because a double runs out forty decades before
its range ends.

GMT's fly integrator (`CameraController.update`) turned out to need very little to serve both. It
never read a position. It took the distance to the surface as a plain argument, turned the camera
object it was handed, and had exactly one line tied to GMT: it emitted the move itself, as the
string event `offset_shift` on GMT's bus. Two absolute numbers were also baked in - a slowest speed
of `1e-6` world units a second, and a minimum distance of `1e-4` while Shift is held - which are
harmless at GMT's scales and fatal at 1e-30, where one frame at the speed floor throws the camera
twenty-two decades past the surface.

Nothing in the repo flew in a test. So before any of it moved, a replay guard was written against
the old code and falsified (`debug/test-nav-replay.mts`: 17 scripted segments, 834 frames, every
displacement and the camera quaternion compared as float64 bit patterns; 69 of 71 single breaks
went red, the other two bit-identical by construction).

## Decision

1. **The seam is a displacement.** Navigation may hand the renderer a displacement and may be told
   a distance. It never reads an absolute position back as numbers. The integrator takes a sink,
   `translate(dx, dy, dz)` in world axes and world units, as a required setting, and whoever owns
   the position applies it.
2. **The integrator lives in the engine**, `engine/plugins/navigation/FlyIntegrator.ts`, with the
   Shift / Alt modifiers it reads. `engine-gmt` re-exports both under the names GMT already
   imports (`CameraController`, `engine-gmt/navigation/modifiers`).
3. **The two floors are settings whose defaults are GMT's numbers** (`minSpeed`,
   `boostMinDistance`). GMT passes neither. An app that goes deep passes 0 for both.
4. **GMT's sink emits what the integrator used to emit**: one function in `Navigation.tsx`,
   `emitOffsetShift`, emitting `offset_shift` with the same three numbers. The worker's virtual
   space and the tick driver receive what they received before.
5. **A sink argument, not a second listener on GMT's event.** The cheaper variant - the new app
   subscribing to `offset_shift` on the engine bus - was rejected: the event name is GMT's worker
   vocabulary, and a second listener on it is an accident waiting for the day both renderers are
   on one page.
6. **The distance stays a plain argument.** A registered "distance source" was considered and
   dropped: GMT's probe both reads and writes its measured distance, and the write-back is
   load-bearing for saves, Step Back and the focus pick. Each app passes the number it has.

## Consequences

- GMT flies exactly as before, and that is checked rather than believed: the replay passes
  17 of 17 to the last bit against a golden recorded from the code before the move, and
  `git diff --stat debug/nav-replay-golden.json` prints nothing. Falsified again on the integrator
  at its new home (both default floors, the ease rate, the sink's sign, the Alt modifier).
- The replay drives the integrator directly and cannot see GMT's call site. `npm run smoke:fly`
  does: in app-gmt's Fly mode, holding W must move `sceneOffset` along the view and S back
  (falsified: a sink emitting `-z`, and a sink emitting nothing).
- Still unguarded in GMT: strafe, vertical, roll, the wheel's speed law, drag-look and the sticks
  as wired through `useInputController.ts`. Their maths is pinned by the replay; their wiring is
  not opened by any test. That guard is due before the input hook is made renderer-free.
- A turn is still applied to a three.js object about its own axes, so a caller that wants a level
  horizon levels the quaternion after `update` and writes it back. The integrator did not gain a
  roll or up-axis setting.
- Re-recording the replay's golden needs an ADR that mentions `nav-replay`. This one does not
  authorise a re-record: the numbers did not change.
