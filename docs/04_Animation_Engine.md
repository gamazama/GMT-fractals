
# Animation Engine

The Animation Engine handles the sequencing, interpolation, and application of keyframe data.

## 1. Structure

*   **Store:** Holds the `AnimationSequence` (Tracks, Keyframes).
*   **Engine (`AnimationEngine.ts`):** Runs the logic. It does not store data, only processes it.

## 2. Playback Logic

### Real-Time (`tick`)
*   Advances `currentFrame` based on `deltaTime`.
*   Skips frames if performance lags to maintain sync with audio/wall-clock.

### Offline (`scrub`)
*   Used by the Video Exporter.
*   Forces the engine to a specific exact frame.
*   Disables all "smoothing" or "damping" logic to ensure mathematical precision.

## 3. Data Binding (DDFS)

The engine uses a dynamic binding system to control any parameter in the app.
*   **Track ID:** e.g., `lighting.light0_posX` or `coreMath.paramA`.
*   **Resolution:**
    1.  The engine parses the ID (`Feature.Param`).
    2.  It looks up the Feature in the `FeatureRegistry`.
    3.  It finds the corresponding Zustand Action (`setLighting`, `setCoreMath`).
    4.  It creates a **Binder Function** (Closure) that applies the value.

## 4. Interpolation

Keyframes support three modes:
1.  **Step:** Instant jump.
2.  **Linear:** Constant speed ($t$).
3.  **Bezier:** Cubic Bezier curves with adjustable handles (Auto, Split, Flat, Unified).
    *   Solved via Newton-Raphson iteration in `BezierMath.ts`.

## 5. Unified Camera Animation

Animating a camera in "Infinite Zoom" space is non-trivial because the coordinates are split (Local vs Offset).

**The Solution:**
*   **Recording:** We merge Local + Offset into a single 64-bit "Unified" coordinate.
*   **Storage:** We save this unified value in the keyframe.
*   **Playback:** The engine interpolates the unified value, then splits it back into `Offset` (Integer) and `Local` (Fraction) parts before uploading to the GPU.
*   **Rotation:** Quaternions are interpolated via SLERP.
