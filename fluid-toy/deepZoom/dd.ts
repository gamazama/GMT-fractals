/**
 * Re-export shim — double-double arithmetic was carved into the shared
 * `engine/fractal/deepZoom` library so the Gradient Explorer's live-fractal
 * deep-zoom path uses the SAME DD pan math fluid-toy's gestures use (no fork).
 *
 * @see engine/fractal/deepZoom/dd.ts (canonical source)
 */
export { twoSum, ddAddF64, ddSub } from '../../engine/fractal/deepZoom/dd';
