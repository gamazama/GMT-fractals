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
    if (tid.startsWith('lights.') || tid.startsWith('lighting.')) return 'Lighting';
    if (
        tid.startsWith('coreMath.') ||
        tid.startsWith('geometry.') ||
        tid.startsWith('param') ||
        tid.startsWith('julia.') ||
        tid.startsWith('hybridParams.') ||
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
