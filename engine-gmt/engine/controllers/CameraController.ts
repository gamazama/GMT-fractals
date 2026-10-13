/**
 * engine-gmt/engine/controllers/CameraController.ts - GMT's name for the engine's fly integrator.
 *
 * The integrator moved to `engine/plugins/navigation/FlyIntegrator.ts` on 2026-10-08 so a second
 * renderer can fly with the same code. It no longer emits `offset_shift` itself: it hands each
 * displacement to a sink, and GMT's one caller passes a sink that emits exactly that event
 * (grep `flyController.current.update` in engine-gmt/navigation/Navigation.tsx). GMT passes no
 * floors, so it flies on the integrator's defaults - the numbers it always had.
 *
 * Nothing about GMT's flight changed: `npm run test:nav-replay` replays 834 scripted frames to the
 * last bit through this export.
 *
 * @see docs/adr/0133-navigation-emits-displacements.md
 */
export { FlyIntegrator as CameraController } from '../../../engine/plugins/navigation/FlyIntegrator';
export type { MoveInputState, JoystickInput } from '../../../engine/plugins/navigation/FlyIntegrator';
