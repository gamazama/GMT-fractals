/**
 * Reference-orbit + LA + AT rebuild loop for the deep-zoom path.
 *
 * Watches julia camera + deepZoom flags. When deep zoom is enabled,
 * kicks off a worker build and pushes the result onto
 * `engine.deepZoom`. Surface area:
 *
 *   useDeepZoomOrbit(engineRef)  // wires both effects (rebuild + GPU-time poll)
 *
 * Pulled out of FluidToyApp because the rebuild logic is the single
 * largest chunk of imperative engine plumbing in the app — keeping it
 * separate makes the app shell read like a layout file.
 */

import { useEffect, type RefObject } from 'react';
import { useEngineStore } from '../store/engineStore';
import { useSlice, useLiveModulations } from '../engine/typedSlices';
import type { FluidEngine } from './fluid/FluidEngine';
import { getDeepZoomRuntime } from './deepZoom/laRuntime';
import { setDeepZoomDiag, clearDeepZoomDiag, setDeepZoomJuliaMs } from './deepZoom/diagnostics';

export const useDeepZoomOrbit = (engineRef: RefObject<FluidEngine | null>): void => {
    const julia    = useSlice('julia');
    const deepZoom = useSlice('deepZoom');
    const liveMod  = useLiveModulations();
    const canvasPixelSize = useEngineStore((s) => s.canvasPixelSize);

    // Build effect — re-fires on view / maxIter change while enabled.
    // The shader's gate (`uDeepZoomEnabled` AND `uRefOrbitLen > 1`) keeps
    // rendering the standard path while the orbit is being built — no
    // flash, no stutter.
    useEffect(() => {
        if (!deepZoom.enabled) {
            clearDeepZoomDiag();
            return;
        }
        const engine = engineRef.current;
        if (!engine) return;
        const runtime = getDeepZoomRuntime();
        let cancelled = false;
        const t0 = performance.now();

        const builtCenter: [number, number] = [julia.center.x, julia.center.y];
        // The lo word of the user's DD-pan accumulator. Below ~1e-15
        // zoom this carries the part of the centre that would otherwise
        // be lost in f64 quantisation; above that depth it's typically
        // 0 from a fresh save or 0-init.
        const builtCenterLow: [number, number] = [
            julia.centerLow?.x ?? 0,
            julia.centerLow?.y ?? 0,
        ];
        // Screen-corner |dc|² for AT validity. Worst case is the
        // diagonal: (aspect² + 1)·zoom².
        const aspect = canvasPixelSize[0] / Math.max(1, canvasPixelSize[1]);
        const screenSqrRadius = (aspect * aspect + 1) * julia.zoom * julia.zoom;
        // Power-2 unlocks LA / AT acceleration (their Step rules are
        // hardcoded for d=2). Higher powers fall back to PO-only.
        const power = Math.max(2, Math.round(julia.power ?? 2));
        const isPower2 = power === 2;
        const kind: 'mandelbrot' | 'julia' = julia.kind === 0 ? 'julia' : 'mandelbrot';
        const liveCx = liveMod['julia.juliaC_x'] ?? julia.juliaC.x;
        const liveCy = liveMod['julia.juliaC_y'] ?? julia.juliaC.y;

        runtime.computeReferenceOrbit({
            centerX: builtCenter[0],
            centerY: builtCenter[1],
            centerLowX: builtCenterLow[0],
            centerLowY: builtCenterLow[1],
            zoom: julia.zoom,
            maxIter: deepZoom.maxRefIter,
            power,
            kind,
            juliaCx: liveCx,
            juliaCy: liveCy,
            // LA / AT presently Mandelbrot-only:
            //   - AT's c' = dc·CCoeff + RefC transform collapses to a
            //     constant when dc = 0 (Julia case).
            //   - LA's rebase formula assumes Z[0] = 0 (Mandelbrot
            //     convention); Julia's Z[0] = R₀ breaks rebase math.
            // Both also require power 2 (Step rules are d=2-specific).
            buildLA:         deepZoom.useLA && isPower2 && kind === 'mandelbrot',
            screenSqrRadius: deepZoom.useAT && isPower2 && kind === 'mandelbrot' ? screenSqrRadius : 0,
        }).then((res) => {
            if (cancelled) return;
            const dz = engine.deepZoom;
            dz.setReferenceOrbit(res.orbit, res.length, builtCenter, builtCenterLow);
            if (res.laTable && res.laStages && res.laCount > 0) {
                dz.setLATable(res.laTable, res.laCount, res.laStages);
                dz.setLAEnabled(true);
            } else {
                dz.clearLATable();
                dz.setLAEnabled(false);
            }
            if (res.at) {
                dz.setAT({
                    stepLength:      res.at.stepLength,
                    thresholdC:      res.at.thresholdC,
                    sqrEscapeRadius: res.at.sqrEscapeRadius,
                    refC:      [res.at.refCRe,      res.at.refCIm],
                    ccoeff:    [res.at.ccoeffRe,    res.at.ccoeffIm],
                    invZCoeff: [res.at.invZCoeffRe, res.at.invZCoeffIm],
                });
            } else {
                dz.clearAT();
            }
            engine.redraw();

            const stagesPerLevel: number[] = [];
            if (res.laStages) {
                for (let i = 0; i < res.laStages.length; i += 2) {
                    stagesPerLevel.push(res.laStages[i + 1]);
                }
            }
            setDeepZoomDiag({
                orbitLength:      res.length,
                precisionBits:    res.precisionBits,
                orbitBuildMs:     res.buildMs,
                laStageCount:     res.laStageCount,
                laCount:          res.laCount,
                laBuildMs:        res.laBuildMs,
                laStagesPerLevel: stagesPerLevel,
                juliaMs: 0,  // populated by the GPU-time poll below
            });
            if (deepZoom.showStats) {
                const totalMs = performance.now() - t0;
                console.log(
                    `[deepZoom] orbit len=${res.length} prec=${res.precisionBits}b ` +
                    `LA stages=${res.laStageCount} nodes=${res.laCount} ` +
                    `(orbit=${res.buildMs.toFixed(1)}ms LA=${res.laBuildMs.toFixed(1)}ms total=${totalMs.toFixed(1)}ms)`
                );
            }
        }).catch((err: Error) => {
            if (!cancelled) console.error('[deepZoom] build failed:', err.message);
        });
        return () => { cancelled = true; };
    }, [deepZoom.enabled, deepZoom.useLA, deepZoom.useAT, deepZoom.maxRefIter, deepZoom.showStats,
        julia.center.x, julia.center.y, julia.centerLow?.x, julia.centerLow?.y, julia.zoom,
        julia.power, julia.kind, julia.juliaC.x, julia.juliaC.y,
        canvasPixelSize, engineRef]);

    // Poll engine's GPU-timer EWMA 5×/sec for the diagnostics overlay.
    // pollJuliaTimer drains queries each frame; this just snapshots the
    // smoothed value into the React-visible diag store.
    useEffect(() => {
        if (!deepZoom.enabled) return;
        const tick = () => {
            const e = engineRef.current;
            if (e) setDeepZoomJuliaMs(e.getJuliaMs());
        };
        const id = window.setInterval(tick, 200);
        return () => window.clearInterval(id);
    }, [deepZoom.enabled, engineRef]);
};
