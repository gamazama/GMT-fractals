/**
 * FeatureOverlays — the one host that renders the viewport overlays features declare.
 *
 * PURPOSE
 *   A feature puts something over the picture by declaring `viewportConfig: { componentId, type }`
 *   (`FeatureViewportConfig` in engine/FeatureSystem.ts). This component is the only place that
 *   turns those declarations into React elements. Until 2026-10-08 five loops did it, each a copy
 *   of the next: one per app shell (three) and two — DOM and scene — in
 *   `components/ViewportArea.tsx`. Every one of them rendered the same box with the same props,
 *   so the host takes one prop, `type`.
 *
 * SEAMS
 *   - Who declares: `viewportConfig` on a `FeatureDefinition`, read here through
 *     `featureRegistry.getViewportOverlays()`. The registry is frozen when the store is built, so
 *     the list is read once per mount.
 *   - Who draws: the component registered under that id
 *     (`componentRegistry.register(componentId, Component)`, from an app's or a plugin's UI
 *     registration). It receives `FeatureComponentProps`: `featureId`, `sliceState` (the
 *     feature's own slice, `store[featureId]`) and `actions` (the store, for its setters).
 *     A declaration whose component is not registered, or whose feature has no slice, renders
 *     nothing and does not throw; `validateComponentRefs` (engine/FeatureSystem.ts) is the
 *     dev-time check for the first.
 *   - Who mounts, `type="dom"` (the default): the app, once, as a child of its viewport frame
 *     (`<ViewportFrame>`, or whatever positioned box IS the picture) and AFTER the render
 *     surface. It renders one `absolute inset-0 pointer-events-none` box, so it covers exactly
 *     the picture and scales with it in Fixed mode. The frame's `outerOverlay` slot is the wrong
 *     place for it: that slot is sized to the whole viewport area, not to the picture.
 *   - Who mounts, `type="scene"`: the app, inside its R3F `<Canvas>`. Renders a fragment and no
 *     wrapper, because a DOM element is not valid there.
 *   - Hiding the overlays (a clean feed, a recording) is the app's decision: mount conditionally.
 *
 * PITFALLS
 *   - THE SELECTOR TRAP. Each overlay subscribes to its own slice and nothing else. Reading the
 *     store here with no selector re-renders every overlay on every store write anywhere — one
 *     per slider step, one per animation tick — and during a pointer drag that cascade is what
 *     tripped React's max-depth guard in an app that writes the store per pointer event. Keep
 *     `OverlayInstance` on a per-slice selector.
 *   - `actions` is the store read at render time, not a subscription. Its setters are stable, so
 *     that is enough for them. An overlay must NOT read another feature's state off `actions`:
 *     it re-renders when its own slice changes, so that read goes stale. Subscribe inside the
 *     overlay instead.
 *   - Neither component is memoised, on purpose: a parent that re-renders still re-renders its
 *     overlays. A shell that itself subscribes to the whole store therefore re-renders them as
 *     often as its own inline loop did before the lift; memoising here would change that.
 *   - A declaration with no `type` is a SCENE overlay. It never shows in the default host.
 *   - `renderOrder` on the declaration is not applied here, and never was by any of the copies:
 *     overlays render in feature-registration order.
 *   - Input: the box ignores the pointer. An overlay that takes input sets `pointer-events-auto`
 *     on the element that takes it.
 *   - Stacking: the box sits on the `shellViewportOverlay` tier (above the HUD's `shellHud`) and
 *     is a stacking context, so whatever an overlay draws stacks inside it. No raw z-index of
 *     100 or more in an overlay (`npm run check:zindex`); a surface that must escape the
 *     viewport goes through `<Layer tier>`.
 *
 * @invariant A declared DOM overlay whose component is registered and whose feature has a slice
 *   is drawn by this host — proven by: `npm run smoke:engine-demo` ("Demo overlay did not render
 *   (probe=-1)"). Falsified 2026-10-08 by returning null from `FeatureOverlays`: red there, and
 *   `npm run smoke:engine-demo-modulation` red too ("Demo overlay canvas not found"); green
 *   again with the line removed. That smoke boots the one shell that mounts the host through
 *   `components/ViewportArea.tsx`. `smoke:boot` and `smoke:chrome` stayed GREEN with the host
 *   returning null in every app, so they say nothing about overlays — and no guard notices an
 *   app shell that stops MOUNTING the host.
 * @assumption Each overlay re-renders on writes to its own slice only, in both `type`s. Measured
 *   by hand on 2026-10-08 (a throwaway page with one scene and one DOM overlay: a write to
 *   either slice re-rendered that overlay alone; with a selector-less read here it re-rendered
 *   both). No committed check holds it.
 * @assumption `type="scene"` works under R3F's reconciler. Same throwaway page: the overlay's
 *   object was in the R3F scene and followed its slice. No app registers a scene overlay, so
 *   nothing in the smoke suite reaches this branch.
 */

import React, { useMemo } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { featureRegistry } from '../../FeatureSystem';
import { componentRegistry } from '../../../components/registry/ComponentRegistry';
import { z } from '../../../components/ui';

type OverlayConfig = ReturnType<typeof featureRegistry.getViewportOverlays>[number];

export interface FeatureOverlaysProps {
    /** Which declarations to render, matching `FeatureViewportConfig.type`. `'dom'` (default)
     *  renders them inside one box covering the picture; `'scene'` renders them bare, for use
     *  inside an R3F `<Canvas>`. A declaration with no `type` counts as `'scene'`. */
    type?: 'dom' | 'scene';
}

const OverlayInstance: React.FC<{ config: OverlayConfig }> = ({ config }) => {
    const Component = componentRegistry.get(config.componentId);
    // A feature's slice lives at `store[featureId]`; the store's static type has no string index.
    const sliceState = useEngineStore((s) => (s as unknown as Record<string, unknown>)[config.id]);
    if (!Component || !sliceState) return null;
    const actions = useEngineStore.getState();
    return <Component featureId={config.id} sliceState={sliceState} actions={actions} />;
};

export const FeatureOverlays: React.FC<FeatureOverlaysProps> = ({ type = 'dom' }) => {
    const overlays = useMemo(
        () => featureRegistry.getViewportOverlays().filter(o => (o.type ?? 'scene') === type),
        [type],
    );
    const instances = overlays.map(config => <OverlayInstance key={config.id} config={config} />);
    if (type === 'scene') return <>{instances}</>;
    return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: z('shellViewportOverlay') }}>
            {instances}
        </div>
    );
};
