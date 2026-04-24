/**
 * engine-gmt/navigation — public API.
 *
 * Verbatim port of GMT's navigation system: Orbit + Fly modes, DST/SPD
 * HUD, physics-probe distance readback, unified-coordinate handover.
 * Zero logic changes vs GMT source — path-rewrites only.
 *
 * Apps compose two components inside their layout:
 *
 *   <GmtNavigationHud hudRefs={...} state={state} actions={state} />
 *   <Canvas>
 *     <GmtNavigation mode={state.cameraMode} hudRefs={...} setSceneOffset={...} />
 *   </Canvas>
 *
 * `hudRefs` is a plain object of `useRef` handles the HUD renders into
 * and Navigation updates imperatively each frame (DST / SPD readouts,
 * reticle position, reset button visibility). Creating them in a shared
 * parent component that renders BOTH Hud and Navigation is the right
 * shape — see smoke-entry.tsx for a worked example.
 */

export { default as GmtNavigation } from './Navigation';
export { default as GmtNavigationHud } from './HudOverlay';
export type { CameraMode, CameraState, PreciseVector3 } from '../types';
