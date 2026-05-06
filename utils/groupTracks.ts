import { Track } from '../types';

export interface GroupedTracks {
    groups: Record<string, string[]>;
    standalone: string[];
}

const GROUP_ORDER = ['Camera', 'Formula', 'Optics', 'Lighting', 'Shading'] as const;

/**
 * Classify a track id into one of the timeline group buckets.
 * Single source of truth for the grouping rules used by both DopeSheet and GraphSidebar.
 * Returns the group name; tracks that don't match any rule fall into 'Shading'.
 */
export function classifyTrackId(tid: string): typeof GROUP_ORDER[number] {
    if (tid.startsWith('camera.')) return 'Camera';
    // Fluid-toy stores its 2D camera (pan + zoom) on the julia slice
    // alongside the formula params (juliaC, maxIter, ...). Route the
    // camera-shaped subset of julia.* into Camera so it doesn't end up
    // mixed in with Formula tracks in the timeline / graph sidebar.
    if (
        tid === 'julia.zoom' ||
        tid === 'julia.center_x' || tid === 'julia.center_y' ||
        tid === 'julia.centerLow_x' || tid === 'julia.centerLow_y'
    ) return 'Camera';
    if (tid.startsWith('lights.') || tid.startsWith('lighting.')) return 'Lighting';
    if (
        tid.startsWith('coreMath.') ||
        tid.startsWith('geometry.') ||
        tid.startsWith('param') ||
        tid.startsWith('julia.') ||
        tid.startsWith('hybridParams.') ||
        tid.startsWith('interlace.') ||
        tid === 'iterations'
    ) return 'Formula';
    if (tid === 'camFov' || tid.startsWith('optics.') || tid.startsWith('dof')) return 'Optics';
    if (tid.startsWith('fog') || tid.startsWith('atmosphere.')) return 'Shading';
    return 'Shading';
}

export function groupTracks(tracks: Record<string, Track>): GroupedTracks {
    const groups: Record<string, string[]> = {};
    GROUP_ORDER.forEach(g => { groups[g] = []; });

    Object.values(tracks).forEach(t => {
        if (t.hidden) return;
        groups[classifyTrackId(t.id)].push(t.id);
    });

    Object.keys(groups).forEach(k => {
        if (groups[k].length === 0) delete groups[k];
    });

    return { groups, standalone: [] };
}
